import { assertSalesforceConfig, config } from '../config.js'

type SalesforceResponse<T> = { records?: T[]; totalSize?: number } & T

export type SalesforceCustomer = { Id: string; Name: string; Email?: string }
export type SalesforceProduct = { Id: string; Name: string; Model_Number__c?: string; Purchase_Date__c?: string; Email__c?: string }
export type SalesforceCase = { Id: string; CaseNumber: string; Subject: string; Status: string; Priority: string; CreatedDate: string; Description?: string; Email__c?: string; Customer_Product__c?: string; Customer_Product__r?: { Name: string }; Product__r?: { Name: string } }
export type SalesforceComment = { Id: string; CommentBody: string; CreatedDate: string; CreatedBy?: { Name: string } }
type SalesforceFeedPost = { Id: string; Body: string; CreatedDate: string; CreatedBy?: { Name: string } }
type SalesforceFeedComment = { Id: string; CommentBody: string; CreatedDate: string; CreatedBy?: { Name: string }; FeedItemId: string }
export type SalesforceArticle = { Id: string; Title: string; Summary?: string; UrlName?: string }

export class SalesforceError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

function salesforceContactId(customerId: string) {
  return /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/.test(customerId) ? customerId : config.DEV_CUSTOMER_ID
}

function salesforceEmail(email: string) {
  return email.trim().toLowerCase().replaceAll("'", "\\'")
}

export class SalesforceClient {
  private accessToken?: string
  private tokenExpiresAt = 0

  private async authenticate() {
    assertSalesforceConfig()
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.SALESFORCE_CLIENT_ID!,
      client_secret: config.SALESFORCE_CLIENT_SECRET!,
    })
    const response = await fetch(`${config.SALESFORCE_LOGIN_URL}/services/oauth2/token`, { method: 'POST', body })
    if (!response.ok) throw new SalesforceError(response.status, 'Salesforce authentication failed')
    const token = await response.json() as { access_token: string; instance_url?: string; expires_in?: number }
    this.accessToken = token.access_token
    this.tokenExpiresAt = Date.now() + Math.max((token.expires_in ?? 600) - 60, 60) * 1000
    return this.accessToken
  }

  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const token = await this.authenticate()
    const response = await fetch(`${config.SALESFORCE_INSTANCE_URL}/services/data/${config.SALESFORCE_API_VERSION}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    })
    if (response.status === 401 && retry) { this.accessToken = undefined; return this.request(path, init, false) }
    if (!response.ok) {
      const details = await response.json().catch(() => null) as Array<{ message?: string }> | { message?: string } | null
      const message = Array.isArray(details) ? details[0]?.message : details?.message
      throw new SalesforceError(response.status, message ?? `Salesforce request failed (${response.status})`)
    }
    return response.status === 204 ? undefined as T : response.json() as Promise<T>
  }

  async query<T>(soql: string) {
    return this.request<SalesforceResponse<T>>(`/query?q=${encodeURIComponent(soql)}`)
  }

  async getCustomer(customerId: string) {
    const result = await this.query<SalesforceCustomer>(`SELECT Id, Name, Email FROM Contact WHERE External_Customer_Id__c = '${customerId.replaceAll("'", "\\'")}' LIMIT 1`)
    return result.records?.[0]
  }

  async getProducts(customerId: string, email: string) {
    return this.query<SalesforceProduct>(`SELECT Id, Name, Model_Number__c, Purchase_Date__c, Email__c FROM Customer_Product__c WHERE Email__c = '${salesforceEmail(email)}'`)
  }

  async createProduct(customerId: string, email: string, fields: { name: string; modelNumber: string; purchaseDate: string }) {
    const contactId = salesforceContactId(customerId)
    const normalizedEmail = email.trim().toLowerCase()
    const created = await this.request<{ id: string }>('/sobjects/Customer_Product__c', { method: 'POST', body: JSON.stringify({ Contact__c: contactId, Email__c: normalizedEmail, Name: fields.name, Model_Number__c: fields.modelNumber, Purchase_Date__c: fields.purchaseDate }) })
    const result = await this.query<SalesforceProduct>(`SELECT Id, Name, Model_Number__c, Purchase_Date__c, Email__c FROM Customer_Product__c WHERE Id = '${created.id.replaceAll("'", "\\'")}' AND Email__c = '${salesforceEmail(email)}' LIMIT 1`)
    const product = result.records?.[0]
    if (!product) throw new SalesforceError(502, 'Salesforce created the product but did not return its details')
    return product
  }

  async getCases(customerId: string, email: string, status?: string) {
    const statusClause = status === 'In Progress' ? " AND Status IN ('New', 'Escalated')" : status ? ` AND Status = '${status.replaceAll("'", "\\'")}'` : ''
    return this.query<SalesforceCase>(`SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Description, Customer_Product__c, Customer_Product__r.Name FROM Case WHERE Email__c = '${salesforceEmail(email)}'${statusClause} ORDER BY CreatedDate DESC LIMIT 50`)
  }

  async createCase(fields: Record<string, string>, email: string) {
    const caseFields = fields.ContactId ? { ...fields, ContactId: salesforceContactId(fields.ContactId) } : fields
    caseFields.Email__c = email.trim().toLowerCase()
    if (caseFields.Customer_Product__c) {
      const productId = caseFields.Customer_Product__c.replaceAll("'", "\\'")
      const product = await this.query<SalesforceProduct>(`SELECT Id FROM Customer_Product__c WHERE Id = '${productId}' AND Email__c = '${salesforceEmail(email)}' LIMIT 1`)
      if (!product.records?.[0]) throw new SalesforceError(404, 'Customer product not found')
    }
    const created = await this.request<{ id: string; success: boolean; errors: string[] }>('/sobjects/Case', { method: 'POST', body: JSON.stringify(caseFields) })
    const result = await this.query<Pick<SalesforceCase, 'Id' | 'CaseNumber' | 'Status' | 'Subject' | 'Customer_Product__c'>>(`SELECT Id, CaseNumber, Status, Subject, Customer_Product__c FROM Case WHERE Id = '${created.id.replaceAll("'", "\\'")}' LIMIT 1`)
    const record = result.records?.[0]
    if (!record) throw new SalesforceError(502, 'Salesforce created the Case but did not return its details')
    return { ...created, caseNumber: record.CaseNumber, status: record.Status, subject: record.Subject }
  }

  async getCase(customerId: string, email: string, caseId: string) {
    const result = await this.query<SalesforceCase>(`SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Description, Customer_Product__c, Customer_Product__r.Name FROM Case WHERE Id = '${caseId.replaceAll("'", "\\'")}' AND Email__c = '${salesforceEmail(email)}' LIMIT 1`)
    return result.records?.[0]
  }

  async escalateCase(customerId: string, email: string, caseNumber: string) {
    const escapedNumber = caseNumber.replaceAll("'", "\\'")
    const result = await this.query<Pick<SalesforceCase, 'Id' | 'CaseNumber' | 'Status' | 'Priority'>>(`SELECT Id, CaseNumber, Status, Priority FROM Case WHERE CaseNumber = '${escapedNumber}' AND Email__c = '${salesforceEmail(email)}' LIMIT 1`)
    const item = result.records?.[0]
    if (!item) throw new SalesforceError(404, 'Case not found')
    await this.request<void>(`/sobjects/Case/${item.Id}`, { method: 'PATCH', body: JSON.stringify({ Status: 'Escalated', Priority: 'High' }) })
    return { ...item, Status: 'Escalated', Priority: 'High' }
  }

  async addComment(customerId: string, email: string, caseId: string, body: string) {
    const ownedCase = await this.getCase(customerId, email, caseId)
    if (!ownedCase) throw new SalesforceError(404, 'Case not found')
    return this.request<{ id: string }>('/sobjects/CaseComment', { method: 'POST', body: JSON.stringify({ ParentId: caseId, CommentBody: body, IsPublished: true }) })
  }

  async getComments(customerId: string, email: string, caseId: string) {
    const ownedCase = await this.getCase(customerId, email, caseId)
    if (!ownedCase) throw new SalesforceError(404, 'Case not found')
    const escapedCaseId = caseId.replaceAll("'", "\\'")
    const [comments, feedPosts] = await Promise.allSettled([
      this.query<SalesforceComment>(`SELECT Id, CommentBody, CreatedDate, CreatedBy.Name FROM CaseComment WHERE ParentId = '${escapedCaseId}' ORDER BY CreatedDate ASC`),
      this.query<SalesforceFeedPost>(`SELECT Id, Body, CreatedDate, CreatedBy.Name FROM FeedItem WHERE ParentId = '${escapedCaseId}' AND Type = 'TextPost' ORDER BY CreatedDate ASC`),
    ])
    if (comments.status === 'rejected' && feedPosts.status === 'rejected') throw comments.reason
    const posts = feedPosts.status === 'fulfilled' ? feedPosts.value.records ?? [] : []
    const feedComments = posts.length
      ? await this.query<SalesforceFeedComment>(`SELECT Id, CommentBody, CreatedDate, CreatedBy.Name, FeedItemId FROM FeedComment WHERE FeedItemId IN (${posts.map((post) => `'${post.Id.replaceAll("'", "\\'")}'`).join(',')}) ORDER BY CreatedDate ASC`).catch(() => ({ records: [] as SalesforceFeedComment[] }))
      : { records: [] as SalesforceFeedComment[] }
    const records = [
      ...(comments.status === 'fulfilled' ? comments.value.records ?? [] : []),
      ...posts.map((post) => ({ Id: post.Id, CommentBody: post.Body, CreatedDate: post.CreatedDate, CreatedBy: post.CreatedBy })),
      ...(feedComments.records ?? []).map((comment) => ({ Id: comment.Id, CommentBody: comment.CommentBody, CreatedDate: comment.CreatedDate, CreatedBy: comment.CreatedBy })),
    ].sort((left, right) => new Date(left.CreatedDate).getTime() - new Date(right.CreatedDate).getTime())
    return { records, totalSize: records.length }
  }

  async uploadFile(customerId: string, email: string, caseId: string, fileName: string, base64Data: string) {
    const ownedCase = await this.getCase(customerId, email, caseId)
    if (!ownedCase) throw new SalesforceError(404, 'Case not found')
    const content = await this.request<{ id: string }>('/sobjects/ContentVersion', { method: 'POST', body: JSON.stringify({ Title: fileName, PathOnClient: fileName, VersionData: base64Data }) })
    return this.request<{ id: string }>('/sobjects/ContentDocumentLink', { method: 'POST', body: JSON.stringify({ ContentDocumentId: content.id, LinkedEntityId: caseId, ShareType: 'V' }) })
  }

  async searchKnowledge(searchTerm: string) {
    const escapedTerm = searchTerm.replaceAll("'", "\\'")
    return this.query<SalesforceArticle>(`SELECT Id, Title, Summary, UrlName FROM Knowledge__kav WHERE PublishStatus = 'Online' AND (Title LIKE '%${escapedTerm}%' OR Summary LIKE '%${escapedTerm}%') LIMIT 20`)
  }
}

export const salesforce = new SalesforceClient()
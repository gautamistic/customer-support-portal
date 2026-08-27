import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error?.message ?? 'The request could not be completed')
  return response.status === 204 ? undefined as T : await response.json() as T
}

type View = 'Overview' | 'Cases' | 'Products' | 'Knowledge'

type CaseItem = {
  id: string
  number: string
  subject: string
  product: string
  status: 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Escalated'
  priority: 'High' | 'Medium' | 'Low'
  created: string
  updated: string
  description: string
  comments: { author: string; body: string; time: string }[]
}

type SalesforceCaseResponse = {
  Id: string
  CaseNumber: string
  Subject: string
  Status: string
  Priority: string
  CreatedDate: string
  Description?: string
  Product__r?: { Name: string }
}

type SalesforceCommentResponse = {
  Id: string
  CommentBody: string
  CreatedDate: string
  CreatedBy?: { Name: string }
}

const initialCases: CaseItem[] = []

type ProductItem = { name: string; modelNumber: string; purchased: string; warranty: string; accent: 'mint' | 'coral' }
const products: ProductItem[] = []

const articles = [
  { title: 'How to pair your AeroSense device', category: 'Getting started', read: '4 min read', content: 'Turn on Bluetooth, open the Airwise app, and keep your AeroSense device close to your phone. Select Add device, choose your model, and follow the pairing prompts. If the device is not discovered, restart Bluetooth and try again.' },
  { title: 'Understanding filter replacement alerts', category: 'Maintenance', read: '3 min read', content: 'A filter alert means the current filter is ready to be replaced. Turn off the device, remove the old filter, and check the compartment for packaging or debris. Insert the replacement filter firmly, then turn the device back on to clear the alert.' },
  { title: 'Resetting your AeroSense Pro', category: 'Troubleshooting', read: '5 min read', content: 'Power off your AeroSense Pro, then press and hold the reset button for 10 seconds. Release it when the status light begins to pulse and wait for the device to restart. A reset can remove saved settings, so configure your preferences again afterward.' },
  { title: 'Warranty and service coverage', category: 'Account & warranty', read: '2 min read', content: 'Warranty coverage depends on the registered device and purchase date. Keep your proof of purchase available when requesting service. For an account-specific coverage check, create a support case and include your device model and serial number.' },
]

type ChatMessage = { sender: 'bot' | 'user'; text: string }

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const chatTopics = [
  { label: 'Raise a case', keywords: ['raise a case', 'create a case', 'open a case', 'support request'], reply: 'I can help you raise a support case. Please add the issue subject and details in the case form.' },
  { label: 'Pairing issues', keywords: ['pair', 'mobile', 'discover', 'connect'], reply: 'For pairing issues, confirm Bluetooth is enabled, keep your device close to your phone, then restart both the device and the app. If it still cannot be discovered, open the pairing guide below.' },
  { label: 'Filter alerts', keywords: ['filter', 'alert', 'replace'], reply: 'A filter alert usually means the filter needs to be replaced or reseated. Turn the device off, remove the filter, check for packaging or debris, and install the replacement firmly.' },
  { label: 'Reset my device', keywords: ['reset', 'restart', 'factory'], reply: 'To reset your AeroSense Pro, power it off, hold the reset button for 10 seconds, and wait for the status light to pulse. Your saved settings may need to be configured again.' },
  { label: 'Warranty help', keywords: ['warranty', 'coverage', 'covered'], reply: 'Your warranty coverage depends on the registered device and purchase date. Open Warranty and service coverage for the general policy, or create a case if you need an account-specific check.' },
]

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [view, setView] = useState<View>('Overview')
  const [cases, setCases] = useState(initialCases)
  const [productList, setProductList] = useState(products)
  const [dataLoading, setDataLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [dataError, setDataError] = useState('')
  const [caseError, setCaseError] = useState('')
  const [productError, setProductError] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('CS-1048')
  const [filter, setFilter] = useState('All cases')
  const [search, setSearch] = useState('')
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<typeof articles[number] | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [caseDetailsVersion, setCaseDetailsVersion] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ sender: 'bot', text: 'Hi! I can help troubleshoot your Airwise device. What is going wrong?' }])
  const [awaitingCaseDescription, setAwaitingCaseDescription] = useState(false)
    const [awaitingEscalationCaseNumber, setAwaitingEscalationCaseNumber] = useState(false)
  const [creatingCase, setCreatingCase] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (!chatOpen || !user) return
    setChatMessages((current) => current.length === 1 && current[0].sender === 'bot' ? [{ sender: 'bot', text: `Hi ${user.name}, I can help troubleshoot your Airwise device or create a support case. What is going wrong?` }] : current)
  }, [chatOpen, user])

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { user?: { email: string; name: string } } | null) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    setDataLoading(true)
    Promise.allSettled([
      apiRequest<{ records?: SalesforceCaseResponse[] }>('/api/cases'),
      apiRequest<{ records?: Array<{ Id: string; Name: string; Model_Number__c?: string; Purchase_Date__c?: string }> }>('/api/products'),
    ])
      .then(([caseResult, productResult]) => {
        if (caseResult.status === 'fulfilled' && caseResult.value.records?.length) {
          const liveCases = caseResult.value.records.map((item) => ({ id: item.Id, number: item.CaseNumber, subject: item.Subject, product: item.Product__r?.Name ?? 'Supported product', status: ['In Progress', 'Waiting for Customer', 'Resolved', 'Escalated'].includes(item.Status) ? item.Status as CaseItem['status'] : 'In Progress', priority: ['High', 'Medium', 'Low'].includes(item.Priority) ? item.Priority as CaseItem['priority'] : 'Medium', created: new Date(item.CreatedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), updated: 'Recently', description: item.Description ?? '', comments: [] }))
          setCases(liveCases)
          setSelectedCaseId(liveCases[0].id)
        } else if (caseResult.status === 'fulfilled') setCases([])
        if (productResult.status === 'fulfilled' && productResult.value.records?.length) setProductList(productResult.value.records.map((item, index) => ({ name: item.Name, modelNumber: item.Model_Number__c ?? 'Model unavailable', purchased: item.Purchase_Date__c ? new Date(item.Purchase_Date__c).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Not available', warranty: 'Warranty information unavailable', accent: index % 2 ? 'coral' : 'mint' })))
        else if (productResult.status === 'fulfilled') setProductList([])
        const caseError = caseResult.status === 'rejected' ? caseResult.reason : undefined
        const productError = productResult.status === 'rejected' ? productResult.reason : undefined
        setCaseError(caseError ? caseError instanceof Error ? `Cases could not be loaded from Salesforce: ${caseError.message}` : 'Cases could not be loaded from Salesforce.' : '')
        setProductError(productError ? productError instanceof Error ? `Products could not be loaded from Salesforce: ${productError.message}` : 'Products could not be loaded from Salesforce.' : '')
      })
      .finally(() => setDataLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || !selectedCaseId || selectedCaseId.startsWith('CS-')) return
    let cancelled = false
    let firstLoad = true
    const loadCaseDetails = async () => {
      if (firstLoad) setDetailLoading(true)
      try {
        const [caseData, commentData] = await Promise.all([
          apiRequest<SalesforceCaseResponse>(`/api/cases/${encodeURIComponent(selectedCaseId)}`),
          apiRequest<{ records?: SalesforceCommentResponse[] }>(`/api/cases/${encodeURIComponent(selectedCaseId)}/comments`),
        ])
        if (cancelled) return
        setCases((current) => current.map((item) => item.id === selectedCaseId ? {
          ...item,
          number: caseData.CaseNumber,
          subject: caseData.Subject,
          product: caseData.Product__r?.Name ?? item.product,
          status: ['In Progress', 'Waiting for Customer', 'Resolved', 'Escalated'].includes(caseData.Status) ? caseData.Status as CaseItem['status'] : item.status,
          priority: ['High', 'Medium', 'Low'].includes(caseData.Priority) ? caseData.Priority as CaseItem['priority'] : item.priority,
          created: new Date(caseData.CreatedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          description: caseData.Description ?? '',
          comments: (commentData.records ?? []).map((comment) => ({ author: comment.CreatedBy?.Name ?? 'Support', body: comment.CommentBody, time: new Date(comment.CreatedDate).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }) })),
        } : item))
        setDataError('')
      } catch { if (!cancelled) setDataError('Case details could not be loaded from Salesforce.') }
      finally {
        if (firstLoad && !cancelled) setDetailLoading(false)
        firstLoad = false
      }
    }
    void loadCaseDetails()
    const refreshTimer = window.setInterval(loadCaseDetails, 15000)
    return () => { cancelled = true; window.clearInterval(refreshTimer) }
  }, [user, selectedCaseId, caseDetailsVersion])

  const logout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0]
  const filteredCases = useMemo(() => cases.filter((item) => {
    const matchesFilter = filter === 'All cases' || item.status === filter
    const query = search.toLowerCase()
    return matchesFilter && (!query || `${item.id} ${item.subject} ${item.product}`.toLowerCase().includes(query))
  }), [cases, filter, search])
  const filteredArticles = articles.filter((article) => `${article.title} ${article.category}`.toLowerCase().includes(knowledgeSearch.toLowerCase()))

  const addComment = async () => {
    if (!newComment.trim()) return
    try {
      if (!selectedCase) return
      await apiRequest(`/api/cases/${selectedCase.id}/comments`, { method: 'POST', body: JSON.stringify({ body: newComment.trim() }) })
      setNewComment('')
      setCaseDetailsVersion((current) => current + 1)
    } catch { setDataError('Your comment could not be sent. Please try again.') }
  }

  const createCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (creatingCase) return
    const form = new FormData(event.currentTarget)
    setCreatingCase(true)
    try {
      const createdResponse = await apiRequest<{ id: string; caseNumber: string; status: string; subject: string; priority: CaseItem['priority'] }>('/api/cases', { method: 'POST', body: JSON.stringify({ subject: String(form.get('subject')), description: String(form.get('description')), priority: 'Medium' }) })
      const created: CaseItem = { id: createdResponse.id, number: createdResponse.caseNumber, subject: createdResponse.subject, product: 'Supported product', status: createdResponse.status as CaseItem['status'], priority: createdResponse.priority, created: 'Today', updated: 'Just now', description: String(form.get('description')), comments: [] }
      setCases((current) => [created, ...current]); setSelectedCaseId(created.id)
      setShowCreate(false)
      setView('Cases')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'The case could not be created in Salesforce.')
    } finally {
      setCreatingCase(false)
    }
  }

  const createProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const result = await apiRequest<{ Id: string; Name: string; Model_Number__c?: string; Purchase_Date__c?: string }>('/api/products', { method: 'POST', body: JSON.stringify({ name: String(form.get('name')), modelNumber: String(form.get('modelNumber')), purchaseDate: String(form.get('purchaseDate')) }) })
      setProductList((current) => [{ name: result.Name, modelNumber: result.Model_Number__c ?? 'Model unavailable', purchased: result.Purchase_Date__c ? new Date(result.Purchase_Date__c).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Not available', warranty: 'Warranty information unavailable', accent: current.length % 2 ? 'coral' : 'mint' }, ...current])
      setShowRegister(false)
      setView('Products')
      setProductError('')
    } catch (error) {
      setProductError(error instanceof Error ? error.message : 'The product could not be registered in Salesforce.')
    }
  }

  const sendChatMessage = async (message = chatInput) => {
    const text = message.trim()
    if (!text || creatingCase || chatLoading) return
    const lowerText = text.toLowerCase()
    const wantsCase = ['raise a case', 'create a case', 'open a case', 'support request', 'talk to support'].some((keyword) => lowerText.includes(keyword))
    const wantsEscalation = ['escalate', 'high priority', 'make it urgent', 'urgent case'].some((keyword) => lowerText.includes(keyword))
    if (awaitingEscalationCaseNumber) {
      setChatMessages((current) => [...current, { sender: 'user', text }])
      setAwaitingEscalationCaseNumber(false)
      setChatLoading(true)
      apiRequest<{ caseNumber: string; caseId: string; status: string; priority: string }>('/api/cases/escalate', { method: 'POST', body: JSON.stringify({ caseNumber: text }) })
        .then((result) => {
          setCases((current) => current.map((item) => item.id === result.caseId || item.number === result.caseNumber ? { ...item, status: result.status as CaseItem['status'], priority: 'High' } : item))
          setChatMessages((current) => [...current, { sender: 'bot', text: `Case ${result.caseNumber} is now ${result.status} with ${result.priority} priority.` }])
        })
        .catch((error) => setChatMessages((current) => [...current, { sender: 'bot', text: error instanceof Error ? error.message : 'I could not escalate that case. Please check the Case Number and try again.' }]))
        .finally(() => setChatLoading(false))
      return
    }
    if (awaitingCaseDescription) {
      setChatMessages((current) => [...current, { sender: 'user', text }])
      setChatInput('')
      setCreatingCase(true)
      try {
        const transcript = [...chatMessages.filter((item) => item.sender === 'user').map((item) => item.text), text].join('\n')
        const result = await apiRequest<{ id: string; caseNumber: string; status: string; subject: string; description: string; priority: 'High' | 'Medium' | 'Low' }>('/api/cases', { method: 'POST', body: JSON.stringify({ description: transcript }) })
        setAwaitingCaseDescription(false)
        setChatMessages((current) => [...current, { sender: 'bot', text: `Your support case has been created. Case ${result.caseNumber} is ${result.status}.` }])
        setDataError('')
        setCases((current) => [{ id: result.id, number: result.caseNumber, subject: result.subject, product: 'Supported product', status: result.status as CaseItem['status'], priority: result.priority, created: 'Today', updated: 'Just now', description: result.description, comments: [] }, ...current])
        setSelectedCaseId(result.id)
        setView('Cases')
      } catch (error) {
        setChatMessages((current) => [...current, { sender: 'bot', text: error instanceof Error ? error.message : 'I could not create the case. Please try again.' }])
      } finally {
        setCreatingCase(false)
      }
      return
    }
    const conversation = [...chatMessages, { sender: 'user' as const, text }]
    setChatMessages(conversation)
    setChatInput('')
    if (wantsCase) {
      setAwaitingCaseDescription(true)
      return
    }
    if (wantsEscalation) {
      setAwaitingEscalationCaseNumber(true)
      setChatMessages((current) => [...current, { sender: 'bot', text: 'Please send the Case Number you want me to escalate. I will verify it belongs to your account before updating Salesforce.' }])
      return
    }
    setChatLoading(true)
    apiRequest<{ reply: string }>('/api/chat', { method: 'POST', body: JSON.stringify({ messages: conversation }) })
      .then((result) => setChatMessages((current) => [...current, { sender: 'bot', text: result.reply }]))
      .catch((error) => setChatMessages((current) => [...current, { sender: 'bot', text: error instanceof Error ? error.message : 'I could not respond right now. Please try again.' }]))
      .finally(() => setChatLoading(false))
  }

  if (authLoading) return <div className="auth-loading"><span className="brand-mark">A</span><p>Loading your workspace...</p></div>
  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A</span><span>AirWise</span></div>
        <div className="workspace-label">CUSTOMER PORTAL</div>
        <nav aria-label="Primary navigation">
          {(['Overview', 'Cases', 'Products', 'Knowledge'] as View[]).map((item) => <button key={item} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)}><span className="nav-dot">{item === 'Overview' ? '◈' : item === 'Cases' ? '▤' : item === 'Products' ? '□' : '?'}</span>{item}</button>)}
        </nav>
        <div className="sidebar-bottom"><button className="profile" onClick={logout}><span className="avatar">{getInitials(user.name)}</span><span><strong>{user.name}</strong><small>Log out</small></span><span className="more">•••</span></button></div>
      </aside>

      <main className="main-content">
        {view === 'Products' && <div className="product-register-bar"><button className="primary-button" type="button" onClick={() => setShowRegister(true)}><span>+</span> Register a product</button></div>}
        <header className="topbar"><div className="crumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♢<span className="notification-dot" /></button><span className="top-avatar" aria-label={`${user.name} initials`}>{getInitials(user.name)}</span></div></header>

        {(dataLoading || detailLoading) && <div className="data-banner">Syncing your workspace with support data...</div>}{dataError && <div className="data-banner warning"><span>{dataError}</span><button type="button" aria-label="Dismiss data warning" onClick={() => setDataError('')}>×</button></div>}
        {view === 'Overview' && <section className="page animate-in"><div className="page-heading"><div><p className="eyebrow">TUESDAY, AUGUST 25, 2026</p><h1>Good morning, {user.name} <span>✦</span></h1><p className="lede">Here’s the latest on your products and support requests.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><span>+</span> Create a case</button></div><div className="stat-grid"><div className="stat-card dark"><span className="stat-label">OPEN CASES</span><strong>{cases.filter((item) => item.status !== 'Resolved').length.toString().padStart(2, '0')}</strong><span className="stat-note">Current support requests <i>↗</i></span><div className="sparkline">╱╲╱╲╱╲╱</div></div><div className="stat-card"><span className="stat-label">PRODUCTS</span><strong>{productList.length.toString().padStart(2, '0')}</strong><span className="stat-note">Registered devices <i className="green">●</i></span></div><div className="stat-card"><span className="stat-label">AVERAGE RESPONSE</span><strong>4h 12m</strong><span className="stat-note">Typically within one day <i className="green">●</i></span></div></div><div className="content-grid"><div className="panel cases-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR SUPPORT</p><h2>Recent cases</h2></div><button className="text-button" onClick={() => setView('Cases')}>View all <span>→</span></button></div>{cases.length ? cases.slice(0, 3).map((item) => <CaseRow key={item.id} item={item} onClick={() => { setSelectedCaseId(item.id); setView('Cases') }} />) : <div className="empty-state"><strong>No cases found</strong><p>Salesforce has no cases for this customer.</p></div>}</div><div className="panel products-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR DEVICES</p><h2>Products</h2></div><button className="text-button" onClick={() => setView('Products')}>View all <span>→</span></button></div>{productList.length ? productList.map((product) => <ProductRow key={product.modelNumber} product={product} />) : <div className="empty-state"><strong>No products found</strong><p>Salesforce has no products for this customer.</p></div>}<button className="add-product" onClick={() => setView('Products')}>+ Register a product</button></div></div><div className="insight-banner"><span className="insight-spark">✦</span><div><strong>Tip from Airwise</strong><p>Regular filter changes help your AeroSense Pro perform at its best.</p></div><button onClick={() => { setView('Knowledge'); setKnowledgeSearch('filter') }}>Read guide <span>→</span></button></div></section>}

          {view === 'Cases' && <section className="page animate-in"><div className="page-heading compact"><div><p className="eyebrow">SUPPORT CENTER</p><h1>Your cases</h1><p className="lede">Track your questions and stay connected with our team.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><span>+</span> Create a case</button></div><div className="case-toolbar"><div className="search-field"><span>⌕</span><input aria-label="Search cases" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter cases"><option>All cases</option><option>In Progress</option><option>Waiting for Customer</option><option>Resolved</option></select></div><div className="cases-layout"><div className="panel case-list">{filteredCases.length ? filteredCases.map((item) => <CaseRow key={item.id} item={item} selected={selectedCase.id === item.id} onClick={() => setSelectedCaseId(item.id)} />) : <div className="empty-state"><strong>No cases found</strong><p>Try changing your search or filter.</p></div>}</div><CaseDetail item={selectedCase} newComment={newComment} setNewComment={setNewComment} addComment={addComment} /></div></section>}
        {view === 'Cases' && <section className="page animate-in"><div className="page-heading compact"><div><p className="eyebrow">SUPPORT CENTER</p><h1>Your cases</h1><p className="lede">Track your questions and stay connected with our team.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><span>+</span> Create a case</button></div><div className="case-toolbar"><div className="search-field"><span>⌕</span><input aria-label="Search cases" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter cases"><option>All cases</option><option>In Progress</option><option>Waiting for Customer</option><option>Resolved</option></select></div><div className="cases-layout"><div className="panel case-list">{filteredCases.length ? filteredCases.map((item) => <CaseRow key={item.id} item={item} selected={selectedCase?.id === item.id} onClick={() => setSelectedCaseId(item.id)} />) : <div className="empty-state"><strong>No cases found</strong><p>{caseError || 'Salesforce has no cases for this customer.'}</p></div>}</div>{selectedCase ? <CaseDetail item={selectedCase} newComment={newComment} setNewComment={setNewComment} addComment={addComment} /> : <div className="panel empty-state"><strong>No cases found</strong><p>{caseError || 'Salesforce has no cases for this customer.'}</p></div>}</div></section>}

        {view === 'Products' && <section className="page animate-in"><div className="page-heading compact"><div><p className="eyebrow">YOUR DEVICES</p><h1>Products</h1><p className="lede">Everything registered to your account, in one place.</p></div><button className="secondary-button" onClick={() => setView('Knowledge')}>View care guides <span>→</span></button></div>{productList.length ? <div className="product-grid">{productList.map((product) => <div className={`product-card ${product.accent}`} key={product.modelNumber}><div className="product-visual"><span className="device-ring" /><span className="device-label">AIRWISE</span></div><div className="product-info"><span className="coverage">● WARRANTY ACTIVE</span><h2>{product.name}</h2><dl><div><dt>Model number</dt><dd>{product.modelNumber}</dd></div><div><dt>Purchase date</dt><dd>{product.purchased}</dd></div></dl><button className="outline-button" onClick={() => setShowCreate(true)}>Get support <span>→</span></button></div></div>)}</div> : <div className="panel empty-state"><strong>No products found</strong><p>{productError || 'Salesforce has no products for this customer.'}</p></div>}</section>}
  {view === 'Products' && <section className="page animate-in"><div className="page-heading compact"><div><p className="eyebrow">YOUR DEVICES</p><h1>Products</h1><p className="lede">Everything registered to your account, in one place.</p></div><button className="secondary-button" onClick={() => setView('Knowledge')}>View care guides <span>→</span></button></div>{productList.length ? <div className="product-grid">{productList.map((product) => <div className={`product-card ${product.accent}`} key={product.modelNumber}><div className="product-visual"><span className="device-ring" /><span className="device-label">AIRWISE</span></div><div className="product-info"><span className="coverage">● WARRANTY ACTIVE</span><h2>{product.name}</h2><dl><div><dt>Model number</dt><dd>{product.modelNumber}</dd></div><div><dt>Purchase date</dt><dd>{product.purchased}</dd></div></dl><button className="outline-button" onClick={() => setShowCreate(true)}>Get support <span>→</span></button></div></div>)}</div> : <div className="panel empty-state"><strong>No products found</strong><p>{productError || 'Salesforce has no products for this customer.'}</p></div>}</section>}

        {view === 'Knowledge' && <section className="page animate-in"><div className="knowledge-hero"><p className="eyebrow">SELF-SERVICE LIBRARY</p><h1>Find your answer.</h1><p>Quick, clear guides for getting the most from your Airwise products.</p><div className="large-search"><span>⌕</span><input autoFocus aria-label="Search knowledge base" value={knowledgeSearch} onChange={(event) => setKnowledgeSearch(event.target.value)} placeholder="Search guides, topics, or questions" /></div></div><div className="article-heading"><div><p className="eyebrow">{knowledgeSearch ? 'SEARCH RESULTS' : 'POPULAR GUIDES'}</p><h2>{knowledgeSearch ? `${filteredArticles.length} guides found` : 'Start here'}</h2></div></div><div className="article-grid">{filteredArticles.map((article, index) => <button className="article-card" type="button" key={article.title} onClick={() => setSelectedArticle(article)}><span className={`article-number n${index}`}>0{index + 1}</span><span className="article-card-copy"><span className="article-category">{article.category}</span><strong>{article.title}</strong><span>{article.read}</span></span><span className="article-arrow">↗</span></button>)}</div></section>}
      </main>
      <button className={`chat-launcher ${chatOpen ? 'open' : ''}`} type="button" aria-label={chatOpen ? 'Close troubleshooting chat' : 'Open troubleshooting chat'} onClick={() => setChatOpen((current) => !current)}><span className="chat-icon">◌</span><span>{chatOpen ? 'Close chat' : 'Support chat'}</span></button>
      {chatOpen && <ChatPanel input={chatInput} messages={chatMessages} setInput={setChatInput} onSend={sendChatMessage} onClose={() => setChatOpen(false)} creatingCase={creatingCase} chatLoading={chatLoading} />}
      {selectedArticle && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedArticle(null)}><article className="article-modal"><div className="modal-header"><div><p className="eyebrow">{selectedArticle.category}</p><h2>{selectedArticle.title}</h2></div><button type="button" className="close-button" aria-label="Close article" onClick={() => setSelectedArticle(null)}>×</button></div><p>{selectedArticle.content}</p><button type="button" className="primary-button" onClick={() => setSelectedArticle(null)}>Done</button></article></div>}
      {showRegister && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRegister(false)}><form className="modal" onSubmit={createProduct}><div className="modal-header"><div><p className="eyebrow">YOUR DEVICES</p><h2>Register a product</h2></div><button type="button" className="close-button" aria-label="Close registration form" onClick={() => setShowRegister(false)}>×</button></div><label>Product name<input name="name" required placeholder="AeroSense Pro" /></label><label>Model number<input name="modelNumber" required placeholder="AS-PRO-100" /></label><label>Date of purchase<input name="purchaseDate" type="date" required /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowRegister(false)}>Cancel</button><button className="primary-button" type="submit">Add product <span>→</span></button></div></form></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !creatingCase && setShowCreate(false)}><form className="modal" onSubmit={createCase}><div className="modal-header"><div><p className="eyebrow">NEW REQUEST</p><h2>Create a support case</h2></div><button type="button" className="close-button" onClick={() => !creatingCase && setShowCreate(false)} disabled={creatingCase}>×</button></div><label>Subject<input name="subject" required placeholder="What can we help with?" /></label><label>Description<textarea name="description" required placeholder="Tell us what happened..." rows={4} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)} disabled={creatingCase}>Cancel</button><button className="primary-button" type="submit" disabled={creatingCase}>{creatingCase ? <><span className="loading-spinner" aria-hidden="true" /> Creating case...</> : <>Submit case <span>→</span></>}</button></div></form></div>}
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (user: { email: string; name: string }) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : mode === 'register' ? '/api/auth/register' : '/api/auth/password-reset'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'reset' ? { email: form.get('email') } : { email: form.get('email'), password: form.get('password'), name: form.get('name') }),
      })
      const data = await response.json() as { user?: { email: string; name: string }; message?: string; error?: { message: string } }
      if (!response.ok) throw new Error(data.error?.message ?? 'The request could not be completed')
      if (mode === 'reset') { setError(data.message ?? 'Check your email for reset instructions'); return }
      if (!data.user) throw new Error('Unable to authenticate')
      onLogin(data.user)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  const isReset = mode === 'reset'
  const isRegister = mode === 'register'
  return <main className="login-page"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><section className="login-card"><div className="login-brand"><span className="brand-mark">A</span><strong>airwise</strong></div><p className="eyebrow">CUSTOMER PORTAL</p><h1>{isReset ? 'Reset access.' : isRegister ? 'Create your account.' : 'Welcome back.'}</h1><p className="login-copy">{isReset ? 'Enter your email and we will send recovery instructions.' : 'Sign in to track your products, cases, and support conversations.'}</p><form onSubmit={submit}>{isRegister && <label>Full name<input name="name" autoComplete="name" placeholder="Your name" required /></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>{!isReset && <label>Password{!isRegister && <a href="#reset" onClick={(event) => { event.preventDefault(); setMode('reset'); setError('') }}>Forgot password?</a>}<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="Enter your password" required /></label>}{error && <p className={isReset && error.startsWith('Check') ? 'login-success' : 'login-error'} role="alert">{error}</p>}<button className="primary-button login-button" disabled={submitting} type="submit">{submitting ? 'Please wait...' : isReset ? 'Send reset instructions' : isRegister ? 'Create account' : 'Sign in'} <span>→</span></button></form><p className="login-footer">{isReset ? <a href="#login" onClick={(event) => { event.preventDefault(); setMode('login'); setError('') }}>Back to sign in</a> : isRegister ? <>Already have an account? <a href="#login" onClick={(event) => { event.preventDefault(); setMode('login') }}>Sign in</a></> : <>Need an account? <a href="#register" onClick={(event) => { event.preventDefault(); setMode('register') }}>Create one</a></>}</p></section><p className="login-privacy">Your support information is protected and kept private.</p></main>
}

function CaseRow({ item, onClick, selected = false }: { item: CaseItem; onClick: () => void; selected?: boolean }) {
  return <button className={`case-row ${selected ? 'selected' : ''}`} onClick={onClick}><span className={`case-status ${item.status.toLowerCase().replaceAll(' ', '-')}`} /><span className="case-row-main"><strong>{item.subject}</strong><small>Case {item.number} <b>·</b> {item.product}</small></span><span className={`status-pill ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span><span className="row-arrow">→</span></button>
}

function ProductRow({ product }: { product: ProductItem }) { return <div className="product-row"><span className={`product-thumb ${product.accent}`}><span /></span><span><strong>{product.name}</strong><small>{product.modelNumber}</small></span><span className="warranty-dot">●</span></div> }

function ChatPanel({ input, messages, setInput, onSend, onClose, creatingCase, chatLoading }: { input: string; messages: ChatMessage[]; setInput: (value: string) => void; onSend: (message?: string) => void; onClose: () => void; creatingCase: boolean; chatLoading: boolean }) {
  const [topicsOpen, setTopicsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, creatingCase, chatLoading])
  const send = (message?: string) => { setTopicsOpen(false); onSend(message) }
  return <section className="chat-panel" aria-label="Troubleshooting chat"><header className="chat-header"><div><span className="eyebrow">AIRWISE ASSIST</span><h2>Troubleshoot together</h2></div><button type="button" className="close-button" aria-label="Close chat" onClick={onClose}>×</button></header><div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.sender}`} key={`${message.sender}-${index}`}><span className="chat-avatar">{message.sender === 'bot' ? 'A' : 'You'}</span><p>{message.text}</p></div>)}{(creatingCase || chatLoading) && <div className="chat-message bot"><span className="chat-avatar">A</span><p className="creating-message"><span className="loading-spinner" aria-hidden="true" /> {creatingCase ? 'Creating your case...' : 'Thinking...'}</p></div>}<div ref={messagesEndRef} /></div><div className={`chat-topics ${topicsOpen ? 'expanded' : 'collapsed'}`}><button type="button" className="chat-topics-toggle" aria-expanded={topicsOpen} onClick={() => setTopicsOpen((current) => !current)}><small>TRY A TOPIC</small><span aria-hidden="true">{topicsOpen ? '−' : '+'}</span></button>{topicsOpen && <div className="chat-topic-options">{chatTopics.map((topic) => <button type="button" key={topic.label} onClick={() => send(topic.label)} disabled={creatingCase || chatLoading}>{topic.label}</button>)}</div>}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); send() }}><input aria-label="Describe your issue" value={input} onChange={(event) => setInput(event.target.value)} placeholder={creatingCase ? 'Creating case...' : 'Share what happened...'} disabled={creatingCase || chatLoading} /><button type="submit" aria-label="Send message" disabled={creatingCase || chatLoading}>{creatingCase || chatLoading ? <span className="loading-spinner" aria-hidden="true" /> : '→'}</button></form></section>
}

function CaseDetail({ item, newComment, setNewComment, addComment }: { item: CaseItem; newComment: string; setNewComment: (value: string) => void; addComment: () => void }) {
  return <div className="panel case-detail"><div className="detail-top"><div><span className="case-id">CASE {item.number}</span><h2>{item.subject}</h2></div><span className={`status-pill ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></div><div className="detail-meta"><span><small>Product</small><strong>{item.product}</strong></span><span><small>Created</small><strong>{item.created}</strong></span><span><small>Priority</small><strong>{item.priority}</strong></span></div><p className="detail-description">{item.description}</p><div className="conversation"><div className="conversation-title"><span>Conversation</span><small>{item.comments.length} messages</small></div>{item.comments.map((comment, index) => <div className={`message ${comment.author === 'You' ? 'customer' : ''}`} key={`${comment.time}-${index}`}><span className="message-avatar">{comment.author === 'You' ? 'JM' : 'MC'}</span><div><div className="message-meta"><strong>{comment.author}</strong><small>{comment.time}</small></div><p>{comment.body}</p></div></div>)}<div className="comment-box"><textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Write a reply..." rows={2} /><div><button className="send-button" type="button" onClick={addComment}>Send <span>→</span></button></div></div></div></div>
}

export default App

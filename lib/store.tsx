// ============================================================================
// JanitorForge - Application Store
// Client-side state management using React Context
// ============================================================================

'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { 
  Bot, 
  BotFormData, 
  RequestForm, 
  Request, 
  RequestStatus,
  NavigationView 
} from './types'

// ----------------------------------------------------------------------------
// Store State Interface
// ----------------------------------------------------------------------------

interface StoreState {
  // Navigation
  currentView: NavigationView
  setCurrentView: (view: NavigationView) => void
  
  // Bots
  bots: Bot[]
  addBot: (data: BotFormData) => Bot
  updateBot: (id: string, data: Partial<BotFormData>) => void
  deleteBot: (id: string) => void
  getBot: (id: string) => Bot | undefined
  
  // Forms
  forms: RequestForm[]
  addForm: (form: Omit<RequestForm, 'id' | 'shareableLink' | 'createdAt' | 'updatedAt'>) => RequestForm
  updateForm: (id: string, data: Partial<RequestForm>) => void
  deleteForm: (id: string) => void
  getForm: (id: string) => RequestForm | undefined
  
  // Requests
  requests: Request[]
  addRequest: (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>) => Request
  updateRequestStatus: (id: string, status: RequestStatus, notes?: string) => void
  deleteRequest: (id: string) => void
  getRequestsByFormId: (formId: string) => Request[]
  getRequestsByStatus: (status: RequestStatus) => Request[]
  
  // UI State
  selectedBotId: string | null
  setSelectedBotId: (id: string | null) => void
  selectedFormId: string | null
  setSelectedFormId: (id: string | null) => void
}

// ----------------------------------------------------------------------------
// Context Creation
// ----------------------------------------------------------------------------

const StoreContext = createContext<StoreState | null>(null)

// ----------------------------------------------------------------------------
// Sample Data for Development
// ----------------------------------------------------------------------------

const sampleBots: Bot[] = [
  {
    id: uuidv4(),
    name: 'Luna the Witch',
    shortDescription: 'A mysterious witch living in an enchanted forest',
    personality: '{{char}} is a 200-year-old witch who speaks in riddles. She is wise but playful, often teasing {{user}} with cryptic advice.',
    firstMessage: '*The candles flicker as you enter the cottage* Ah, {{user}}... I have been expecting you. *Luna smiles mysteriously* The cards told me you would come seeking answers.',
    scenario: '{{user}} has stumbled upon {{char}}\'s cottage deep in the Whispering Woods, seeking help with a mysterious curse.',
    exampleDialogues: '{{user}}: Can you help me break this curse?\n{{char}}: *laughs softly* Break it? My dear {{user}}, curses are not broken... they are understood. Tell me, what did you do to earn such a gift?',
    tags: ['Fantasy', 'Magic', 'Witch', 'Mystery'],
    rating: 'SFW',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: uuidv4(),
    name: 'Captain Vex',
    shortDescription: 'A roguish space pirate with a heart of gold',
    personality: '{{char}} is a charming space pirate captain. He is witty, adventurous, and fiercely loyal to his crew. {{char}} has a complicated past with the Galactic Authority.',
    firstMessage: '*Captain Vex leans against the airlock, arms crossed* Well, well... a stowaway. *He grins* You have exactly thirty seconds to convince me why I shouldn\'t space you, {{user}}.',
    scenario: '{{user}} has been discovered hiding in the cargo hold of {{char}}\'s ship, the Stellar Rogue.',
    exampleDialogues: '{{user}}: I can be useful to your crew!\n{{char}}: *raises an eyebrow* Useful, you say? Everyone says that right before they try to steal my ship. *He chuckles* Alright, {{user}}, let\'s see what you\'ve got.',
    tags: ['Sci-Fi', 'Space', 'Adventure', 'Pirates'],
    rating: 'SFW',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-15'),
  },
]

const sampleForms: RequestForm[] = [
  {
    id: uuidv4(),
    title: 'Bot Request Form',
    description: 'Submit your bot request ideas here!',
    sections: [
      {
        id: uuidv4(),
        title: 'Basic Information',
        fields: [
          { id: uuidv4(), type: 'text', label: 'Your Name', required: true, placeholder: 'Enter your name' },
          { id: uuidv4(), type: 'rating-type', label: 'Content Rating', required: true },
        ],
      },
      {
        id: uuidv4(),
        title: 'Bot Details',
        fields: [
          { id: uuidv4(), type: 'text', label: 'Bot Name', required: true, placeholder: 'What should the bot be called?' },
          { id: uuidv4(), type: 'textarea', label: 'Character Description', required: true, placeholder: 'Describe the character...' },
          { id: uuidv4(), type: 'tags', label: 'Tropes/Tags', required: false, placeholder: 'e.g., Enemies to Lovers, Fantasy' },
        ],
      },
    ],
    shareableLink: 'form-abc123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-05'),
  },
]

const sampleRequests: Request[] = [
  {
    id: uuidv4(),
    formId: sampleForms[0].id,
    formTitle: 'Bot Request Form',
    status: 'new',
    submitterName: 'Alex',
    responses: {
      'Your Name': 'Alex',
      'Content Rating': 'SFW',
      'Bot Name': 'Professor Midnight',
      'Character Description': 'A mysterious professor at a magic academy who teaches forbidden arts',
      'Tropes/Tags': 'Dark Academia, Magic, Mystery',
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: uuidv4(),
    formId: sampleForms[0].id,
    formTitle: 'Bot Request Form',
    status: 'accepted',
    submitterName: 'Jordan',
    responses: {
      'Your Name': 'Jordan',
      'Content Rating': 'SFW',
      'Bot Name': 'Chef Rosario',
      'Character Description': 'A passionate Italian chef who runs a cozy restaurant',
      'Tropes/Tags': 'Slice of Life, Romance, Food',
    },
    notes: 'Great concept! Working on this one.',
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-02-02'),
  },
  {
    id: uuidv4(),
    formId: sampleForms[0].id,
    formTitle: 'Bot Request Form',
    status: 'completed',
    submitterName: 'Sam',
    responses: {
      'Your Name': 'Sam',
      'Content Rating': 'SFW',
      'Bot Name': 'Detective Nova',
      'Character Description': 'A cyberpunk detective in Neo Tokyo',
      'Tropes/Tags': 'Cyberpunk, Mystery, Noir',
    },
    notes: 'Published! Check it out on my profile.',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-25'),
  },
]

// ----------------------------------------------------------------------------
// Store Provider Component
// ----------------------------------------------------------------------------

export function StoreProvider({ children }: { children: ReactNode }) {
  // Navigation state
  const [currentView, setCurrentView] = useState<NavigationView>('dashboard')
  
  // Data state
  const [bots, setBots] = useState<Bot[]>(sampleBots)
  const [forms, setForms] = useState<RequestForm[]>(sampleForms)
  const [requests, setRequests] = useState<Request[]>(sampleRequests)
  
  // UI state
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  
  // Bot operations
  const addBot = useCallback((data: BotFormData): Bot => {
    const newBot: Bot = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setBots(prev => [...prev, newBot])
    return newBot
  }, [])
  
  const updateBot = useCallback((id: string, data: Partial<BotFormData>) => {
    setBots(prev => prev.map(bot => 
      bot.id === id 
        ? { ...bot, ...data, updatedAt: new Date() } 
        : bot
    ))
  }, [])
  
  const deleteBot = useCallback((id: string) => {
    setBots(prev => prev.filter(bot => bot.id !== id))
  }, [])
  
  const getBot = useCallback((id: string) => {
    return bots.find(bot => bot.id === id)
  }, [bots])
  
  // Form operations
  const addForm = useCallback((formData: Omit<RequestForm, 'id' | 'shareableLink' | 'createdAt' | 'updatedAt'>): RequestForm => {
    const newForm: RequestForm = {
      id: uuidv4(),
      ...formData,
      shareableLink: `form-${uuidv4().slice(0, 8)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setForms(prev => [...prev, newForm])
    return newForm
  }, [])
  
  const updateForm = useCallback((id: string, data: Partial<RequestForm>) => {
    setForms(prev => prev.map(form => 
      form.id === id 
        ? { ...form, ...data, updatedAt: new Date() } 
        : form
    ))
  }, [])
  
  const deleteForm = useCallback((id: string) => {
    setForms(prev => prev.filter(form => form.id !== id))
  }, [])
  
  const getForm = useCallback((id: string) => {
    return forms.find(form => form.id === id)
  }, [forms])
  
  // Request operations
  const addRequest = useCallback((requestData: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Request => {
    const newRequest: Request = {
      id: uuidv4(),
      ...requestData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setRequests(prev => [...prev, newRequest])
    return newRequest
  }, [])
  
  const updateRequestStatus = useCallback((id: string, status: RequestStatus, notes?: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? { ...req, status, notes: notes ?? req.notes, updatedAt: new Date() } 
        : req
    ))
  }, [])
  
  const deleteRequest = useCallback((id: string) => {
    setRequests(prev => prev.filter(req => req.id !== id))
  }, [])
  
  const getRequestsByFormId = useCallback((formId: string) => {
    return requests.filter(req => req.formId === formId)
  }, [requests])
  
  const getRequestsByStatus = useCallback((status: RequestStatus) => {
    return requests.filter(req => req.status === status)
  }, [requests])
  
  const value: StoreState = {
    currentView,
    setCurrentView,
    bots,
    addBot,
    updateBot,
    deleteBot,
    getBot,
    forms,
    addForm,
    updateForm,
    deleteForm,
    getForm,
    requests,
    addRequest,
    updateRequestStatus,
    deleteRequest,
    getRequestsByFormId,
    getRequestsByStatus,
    selectedBotId,
    setSelectedBotId,
    selectedFormId,
    setSelectedFormId,
  }
  
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

// ----------------------------------------------------------------------------
// Custom Hook for accessing the store
// ----------------------------------------------------------------------------

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

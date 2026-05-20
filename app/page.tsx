// ============================================================================
// JanitorForge - Main Application Page
// Entry point that renders the dashboard with dynamic views
// ============================================================================

import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { ClientApp } from './client-app'

// ----------------------------------------------------------------------------
// Page Component - Server side auth check
// ----------------------------------------------------------------------------

export default async function Page() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <ClientApp username={session.username} />
}

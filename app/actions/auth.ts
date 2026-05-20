'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function loginWithPin(username: string, pin: string) {
  const supabase = await createClient()
  
  // Check credentials
  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, username')
    .eq('username', username.toLowerCase().trim())
    .eq('pin', pin)
    .single()

  if (error || !user) {
    return { success: false, error: 'Usuario o PIN incorrecto' }
  }

  // Update last login
  await supabase
    .from('app_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id)

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set('janitorforge_session', JSON.stringify({
    userId: user.id,
    username: user.username,
    loggedInAt: new Date().toISOString()
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  return { success: true, user: { id: user.id, username: user.username } }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('janitorforge_session')
  return { success: true }
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('janitorforge_session')
  
  if (!session?.value) {
    return null
  }

  try {
    return JSON.parse(session.value) as {
      userId: string
      username: string
      loggedInAt: string
    }
  } catch {
    return null
  }
}

export async function registerUser(username: string, pin: string) {
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return { success: false, error: 'El PIN debe ser de 4 digitos' }
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('app_users')
    .insert({ 
      username: username.toLowerCase().trim(), 
      pin 
    })
    .select('id, username')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'El usuario ya existe' }
    }
    return { success: false, error: 'Error al registrar usuario' }
  }

  return { success: true, user: data }
}

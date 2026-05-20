// ============================================================================
// JanitorForge - Dashboard Home View
// Overview panel with statistics and recent activity
// ============================================================================

'use client'

import { Bot, FileText, Inbox, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// ----------------------------------------------------------------------------
// Stat Card Component
// ----------------------------------------------------------------------------

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: typeof Bot
  trend?: 'up' | 'down' | 'neutral'
  accentColor?: string
}

function StatCard({ title, value, description, icon: Icon, accentColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          accentColor || 'bg-primary/10'
        )}>
          <Icon className={cn('h-5 w-5', accentColor ? 'text-foreground' : 'text-primary')} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-transparent" />
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Recent Bot Card
// ----------------------------------------------------------------------------

interface RecentBotCardProps {
  name: string
  description: string
  rating: 'SFW' | 'NSFW'
  tags: string[]
  updatedAt: Date
  onEdit: () => void
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function RecentBotCard({ name, description, rating, tags, updatedAt, onEdit }: RecentBotCardProps) {
  return (
    <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <Badge 
            variant={rating === 'SFW' ? 'secondary' : 'destructive'}
            className="ml-2 shrink-0"
          >
            {rating}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{tags.length - 3} more
            </span>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
            <Clock className="h-3 w-3" />
            {formatDate(updatedAt)}
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Empty State Component
// ----------------------------------------------------------------------------

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: {
  icon: typeof Bot
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Dashboard Home Component
// ----------------------------------------------------------------------------

export function DashboardHome() {
  const { bots, forms, requests, setCurrentView, setSelectedBotId } = useStore()
  
  // Calculate stats
  const stats = {
    totalBots: bots.length,
    activeForms: forms.filter(f => f.isActive).length,
    pendingRequests: requests.filter(r => r.status === 'new' || r.status === 'accepted').length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
  }
  
  // Get recent bots (sorted by updatedAt)
  const recentBots = [...bots]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here&apos;s an overview of your bot creator workspace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bots"
          value={stats.totalBots}
          description="Characters created"
          icon={Bot}
        />
        <StatCard
          title="Active Forms"
          value={stats.activeForms}
          description="Accepting requests"
          icon={FileText}
          accentColor="bg-chart-2/20"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          description="Awaiting response"
          icon={Inbox}
          accentColor="bg-chart-3/20"
        />
        <StatCard
          title="Completed"
          value={stats.completedRequests}
          description="Requests fulfilled"
          icon={CheckCircle}
          accentColor="bg-success/20"
        />
      </div>

      {/* Recent Bots Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent Bots</h2>
            <p className="text-sm text-muted-foreground">Your most recently updated characters</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('bots')}
          >
            View All
          </Button>
        </div>

        {recentBots.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentBots.map((bot) => (
              <RecentBotCard
                key={bot.id}
                name={bot.name}
                description={bot.shortDescription}
                rating={bot.rating}
                tags={bot.tags}
                updatedAt={bot.updatedAt}
                onEdit={() => {
                  setSelectedBotId(bot.id)
                  setCurrentView('bots')
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Bot}
              title="No bots yet"
              description="Create your first bot to get started. You can import existing character cards or create from scratch."
              actionLabel="Create Your First Bot"
              onAction={() => setCurrentView('bots')}
            />
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50"
            onClick={() => setCurrentView('bots')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Create New Bot</h3>
                <p className="text-sm text-muted-foreground">Start building a new character</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50"
            onClick={() => setCurrentView('forms')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                <FileText className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <h3 className="font-medium">Design Request Form</h3>
                <p className="text-sm text-muted-foreground">Create custom intake forms</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50"
            onClick={() => setCurrentView('release-generator')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <TrendingUp className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <h3 className="font-medium">Generate Release Post</h3>
                <p className="text-sm text-muted-foreground">Announce your latest creation</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

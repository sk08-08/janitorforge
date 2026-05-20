// ============================================================================
// JanitorForge - Bot Manager View
// Full CRUD interface for managing bots
// ============================================================================

'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, 
  Search, 
  Grid3X3, 
  List, 
  Bot as BotIcon, 
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BotForm } from './bot-form'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { countBotTokens, exportCharacterCardPNG } from '@/lib/bot-utils'
import { toast } from 'sonner'
import type { Bot, BotFormData } from '@/lib/types'

// ----------------------------------------------------------------------------
// View Modes
// ----------------------------------------------------------------------------

type ViewMode = 'grid' | 'list'
type FilterRating = 'all' | 'SFW' | 'NSFW'

// ----------------------------------------------------------------------------
// Bot Card Component
// ----------------------------------------------------------------------------

interface BotCardProps {
  bot: Bot
  viewMode: ViewMode
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
}

function BotCard({ bot, viewMode, onEdit, onDelete, onExport }: BotCardProps) {
  const tokenCount = useMemo(() => countBotTokens(bot), [bot])

  if (viewMode === 'list') {
    return (
      <Card className="transition-all hover:border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BotIcon className="h-6 w-6 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{bot.name}</h3>
              <Badge variant={bot.rating === 'SFW' ? 'secondary' : 'destructive'} className="shrink-0">
                {bot.rating}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {bot.shortDescription || 'No description'}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{tokenCount.toLocaleString()}</span>
              <span>tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{bot.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card className="group transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BotIcon className="h-5 w-5 text-primary" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="mt-3 text-lg">{bot.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {bot.shortDescription || 'No description provided'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={bot.rating === 'SFW' ? 'secondary' : 'destructive'}>
            {bot.rating}
          </Badge>
          {bot.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {bot.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{bot.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{tokenCount.toLocaleString()} tokens</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {bot.updatedAt.toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <BotIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No bots yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Get started by creating your first bot or importing an existing character card.
      </p>
      <Button className="mt-6" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Bot
      </Button>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Bot Manager Component
// ----------------------------------------------------------------------------

export function BotManager() {
  const { bots, addBot, updateBot, deleteBot, selectedBotId, setSelectedBotId } = useStore()
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRating, setFilterRating] = useState<FilterRating>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [deleteConfirmBot, setDeleteConfirmBot] = useState<Bot | null>(null)

  // Check if we should open editing from external navigation
  const externalEditBot = selectedBotId ? bots.find(b => b.id === selectedBotId) : null
  if (externalEditBot && !editingBot && !isCreating) {
    setEditingBot(externalEditBot)
    setSelectedBotId(null)
  }

  // Filter and search bots
  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Rating filter
      const matchesRating = filterRating === 'all' || bot.rating === filterRating

      return matchesSearch && matchesRating
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [bots, searchQuery, filterRating])

  // Handlers
  const handleCreateBot = (data: BotFormData) => {
    addBot(data)
    setIsCreating(false)
    toast.success('Bot created successfully!')
  }

  const handleUpdateBot = (data: BotFormData) => {
    if (editingBot) {
      updateBot(editingBot.id, data)
      setEditingBot(null)
      toast.success('Bot updated successfully!')
    }
  }

  const handleDeleteBot = () => {
    if (deleteConfirmBot) {
      deleteBot(deleteConfirmBot.id)
      setDeleteConfirmBot(null)
      setEditingBot(null)
      toast.success('Bot deleted successfully')
    }
  }

  const handleExportBot = async (bot: Bot) => {
    try {
      const blob = await exportCharacterCardPNG(bot)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bot.name.replace(/\s+/g, '_')}_card.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Character card exported!')
    } catch {
      toast.error('Failed to export character card')
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bot Manager</h1>
          <p className="mt-1 text-muted-foreground">
            Create, edit, and manage your bot characters
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Bot
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRating} onValueChange={(v) => setFilterRating(v as FilterRating)}>
            <SelectTrigger className="w-32">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="SFW">SFW</SelectItem>
              <SelectItem value="NSFW">NSFW</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bot List */}
      {filteredBots.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'space-y-3'
        )}>
          {filteredBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              viewMode={viewMode}
              onEdit={() => setEditingBot(bot)}
              onDelete={() => setDeleteConfirmBot(bot)}
              onExport={() => handleExportBot(bot)}
            />
          ))}
        </div>
      ) : bots.length === 0 ? (
        <Card>
          <EmptyState onCreateNew={() => setIsCreating(true)} />
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No bots match your search criteria</p>
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(''); setFilterRating('all') }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Sheet */}
      <Sheet 
        open={isCreating || !!editingBot} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false)
            setEditingBot(null)
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingBot ? 'Edit Bot' : 'Create New Bot'}</SheetTitle>
            <SheetDescription>
              {editingBot 
                ? 'Update your bot\'s details and personality' 
                : 'Fill in the details to create a new bot character'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BotForm
              initialData={editingBot || undefined}
              onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
              onCancel={() => {
                setIsCreating(false)
                setEditingBot(null)
              }}
              onDelete={editingBot ? () => setDeleteConfirmBot(editingBot) : undefined}
              isEditing={!!editingBot}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmBot} onOpenChange={(open) => !open && setDeleteConfirmBot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmBot?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmBot(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBot}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

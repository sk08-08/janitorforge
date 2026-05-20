// ============================================================================
// JanitorForge - Kanban Board Component
// Visual request management with drag-and-drop columns
// ============================================================================

'use client'

import { useState, useMemo } from 'react'
import { 
  MoreVertical, 
  Trash2, 
  ArrowRight, 
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Inbox,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Request, RequestStatus } from '@/lib/types'

// ----------------------------------------------------------------------------
// Column Configuration
// ----------------------------------------------------------------------------

interface ColumnConfig {
  id: RequestStatus
  title: string
  icon: typeof Inbox
  color: string
  bgColor: string
}

const columns: ColumnConfig[] = [
  { 
    id: 'new', 
    title: 'New', 
    icon: Inbox, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  { 
    id: 'accepted', 
    title: 'In Progress', 
    icon: Loader2, 
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
  },
  { 
    id: 'completed', 
    title: 'Completed', 
    icon: CheckCircle, 
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  { 
    id: 'rejected', 
    title: 'Rejected', 
    icon: XCircle, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
]

// ----------------------------------------------------------------------------
// Request Card Component
// ----------------------------------------------------------------------------

interface RequestCardProps {
  request: Request
  onStatusChange: (status: RequestStatus, notes?: string) => void
  onDelete: () => void
  onViewDetails: () => void
}

function RequestCard({ request, onStatusChange, onDelete, onViewDetails }: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Get primary response fields for preview
  const previewFields = useMemo(() => {
    const entries = Object.entries(request.responses)
    return entries.slice(0, 2)
  }, [request.responses])

  const getNextStatus = (): RequestStatus | null => {
    switch (request.status) {
      case 'new': return 'accepted'
      case 'accepted': return 'completed'
      default: return null
    }
  }

  const nextStatus = getNextStatus()

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {request.submitterName && (
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{request.submitterName}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <MessageSquare className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {nextStatus && (
                <DropdownMenuItem onClick={() => onStatusChange(nextStatus)}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Move to {columns.find(c => c.id === nextStatus)?.title}
                </DropdownMenuItem>
              )}
              {request.status !== 'rejected' && request.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange('rejected')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Preview Fields */}
        <div className="mt-2 space-y-1">
          {previewFields.map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-muted-foreground">{key}: </span>
              <span className="line-clamp-1">
                {Array.isArray(value) ? value.join(', ') : value}
              </span>
            </div>
          ))}
        </div>

        {/* Expandable full details */}
        {Object.keys(request.responses).length > 2 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs">
                {isExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    Show More ({Object.keys(request.responses).length - 2} more)
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {Object.entries(request.responses).slice(2).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}: </span>
                  <span>{Array.isArray(value) ? value.join(', ') : value}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Notes */}
        {request.notes && (
          <div className="mt-2 rounded bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Notes:</p>
            <p className="text-sm">{request.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {request.formTitle}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {request.createdAt.toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Kanban Column Component
// ----------------------------------------------------------------------------

interface KanbanColumnProps {
  config: ColumnConfig
  requests: Request[]
  onStatusChange: (requestId: string, status: RequestStatus, notes?: string) => void
  onDelete: (requestId: string) => void
  onViewDetails: (request: Request) => void
}

function KanbanColumn({ config, requests, onStatusChange, onDelete, onViewDetails }: KanbanColumnProps) {
  const Icon = config.icon

  return (
    <div className="flex flex-col min-w-[300px] w-[300px]">
      {/* Column Header */}
      <div className={cn(
        'flex items-center gap-2 rounded-t-lg px-3 py-2',
        config.bgColor
      )}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="font-medium">{config.title}</span>
        <Badge variant="secondary" className="ml-auto">
          {requests.length}
        </Badge>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 rounded-b-lg border border-t-0 bg-card/50">
        <div className="space-y-2 p-2" style={{ minHeight: '400px' }}>
          {requests.length > 0 ? (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onStatusChange={(status, notes) => onStatusChange(request.id, status, notes)}
                onDelete={() => onDelete(request.id)}
                onViewDetails={() => onViewDetails(request)}
              />
            ))
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No requests
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Request Details Dialog
// ----------------------------------------------------------------------------

interface RequestDetailsDialogProps {
  request: Request | null
  onClose: () => void
  onStatusChange: (status: RequestStatus, notes?: string) => void
  onDelete: () => void
}

function RequestDetailsDialog({ request, onClose, onStatusChange, onDelete }: RequestDetailsDialogProps) {
  const [notes, setNotes] = useState(request?.notes || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!request) return null

  const currentColumn = columns.find(c => c.id === request.status)

  return (
    <>
      <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Request Details
              {currentColumn && (
                <Badge variant="outline" className={currentColumn.color}>
                  {currentColumn.title}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Submitted on {request.createdAt.toLocaleDateString()} via {request.formTitle}
            </DialogDescription>
          </DialogHeader>

          {/* Responses */}
          <div className="space-y-4">
            <h4 className="font-medium">Responses</h4>
            <div className="space-y-3">
              {Object.entries(request.responses).map(([key, value]) => (
                <div key={key} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-muted-foreground">{key}</p>
                  <p className="mt-1">
                    {Array.isArray(value) ? value.join(', ') : value || '-'}
                  </p>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <h4 className="font-medium">Notes</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              {request.status === 'new' && (
                <>
                  <Button onClick={() => onStatusChange('accepted', notes)}>
                    Accept
                  </Button>
                  <Button variant="outline" onClick={() => onStatusChange('rejected', notes)}>
                    Reject
                  </Button>
                </>
              )}
              {request.status === 'accepted' && (
                <Button onClick={() => onStatusChange('completed', notes)}>
                  Mark Complete
                </Button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete()
                setShowDeleteConfirm(false)
                onClose()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ----------------------------------------------------------------------------
// Kanban Board Props
// ----------------------------------------------------------------------------

interface KanbanBoardProps {
  requests: Request[]
  onStatusChange: (requestId: string, status: RequestStatus, notes?: string) => void
  onDelete: (requestId: string) => void
}

// ----------------------------------------------------------------------------
// Kanban Board Component
// ----------------------------------------------------------------------------

export function KanbanBoard({ requests, onStatusChange, onDelete }: KanbanBoardProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  // Group requests by status
  const groupedRequests = useMemo(() => {
    const grouped: Record<RequestStatus, Request[]> = {
      new: [],
      accepted: [],
      completed: [],
      rejected: [],
    }
    
    requests.forEach((request) => {
      grouped[request.status].push(request)
    })
    
    // Sort each group by date (newest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as RequestStatus].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    })
    
    return grouped
  }, [requests])

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            config={column}
            requests={groupedRequests[column.id]}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onViewDetails={setSelectedRequest}
          />
        ))}
      </div>

      <RequestDetailsDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={(status, notes) => {
          if (selectedRequest) {
            onStatusChange(selectedRequest.id, status, notes)
            setSelectedRequest(null)
          }
        }}
        onDelete={() => {
          if (selectedRequest) {
            onDelete(selectedRequest.id)
          }
        }}
      />
    </>
  )
}

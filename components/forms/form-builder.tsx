// ============================================================================
// JanitorForge - Form Builder Component
// Visual form designer for creating custom request forms
// ============================================================================

'use client'

import { useState, useCallback } from 'react'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  AlignLeft, 
  ListChecks, 
  CircleDot, 
  CheckSquare,
  Tags,
  Save,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import type { FormField, FormSection, FormFieldType, RequestForm } from '@/lib/types'
import { toast } from 'sonner'

// ----------------------------------------------------------------------------
// Field Type Configuration
// ----------------------------------------------------------------------------

const fieldTypes: { type: FormFieldType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
  { type: 'select', label: 'Dropdown', icon: ListChecks },
  { type: 'radio', label: 'Single Choice', icon: CircleDot },
  { type: 'checkbox', label: 'Multiple Choice', icon: CheckSquare },
  { type: 'rating-type', label: 'SFW/NSFW Rating', icon: Tags },
  { type: 'tags', label: 'Tag Input', icon: Tags },
]

// ----------------------------------------------------------------------------
// Field Editor Component
// ----------------------------------------------------------------------------

interface FieldEditorProps {
  field: FormField
  onUpdate: (field: FormField) => void
  onDelete: () => void
}

function FieldEditor({ field, onUpdate, onDelete }: FieldEditorProps) {
  const [optionInput, setOptionInput] = useState('')
  const fieldConfig = fieldTypes.find(f => f.type === field.type)
  const Icon = fieldConfig?.icon || Type

  const addOption = () => {
    if (optionInput.trim() && field.options) {
      onUpdate({
        ...field,
        options: [...field.options, optionInput.trim()],
      })
      setOptionInput('')
    }
  }

  const removeOption = (index: number) => {
    if (field.options) {
      onUpdate({
        ...field,
        options: field.options.filter((_, i) => i !== index),
      })
    }
  }

  const needsOptions = ['select', 'radio', 'checkbox'].includes(field.type)

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle placeholder */}
          <div className="mt-2 cursor-grab text-muted-foreground">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-3">
            {/* Field header */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="text-xs">
                {fieldConfig?.label || field.type}
              </Badge>
              {field.required && (
                <Badge variant="secondary" className="text-xs">Required</Badge>
              )}
            </div>

            {/* Label input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Field Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                placeholder="Enter field label..."
              />
            </div>

            {/* Placeholder input (for text fields) */}
            {['text', 'textarea', 'tags'].includes(field.type) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                  placeholder="Enter placeholder text..."
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={field.description || ''}
                onChange={(e) => onUpdate({ ...field, description: e.target.value })}
                placeholder="Help text for this field..."
              />
            </div>

            {/* Options (for select, radio, checkbox) */}
            {needsOptions && (
              <div className="space-y-2">
                <Label className="text-xs">Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((option, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeOption(index)}
                      >
                        {option}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onUpdate({ ...field, required: checked })}
                id={`required-${field.id}`}
              />
              <Label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer">
                Required field
              </Label>
            </div>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Section Editor Component
// ----------------------------------------------------------------------------

interface SectionEditorProps {
  section: FormSection
  onUpdate: (section: FormSection) => void
  onDelete: () => void
}

function SectionEditor({ section, onUpdate, onDelete }: SectionEditorProps) {
  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: '',
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? [] : undefined,
    }
    onUpdate({
      ...section,
      fields: [...section.fields, newField],
    })
  }

  const updateField = (fieldId: string, updatedField: FormField) => {
    onUpdate({
      ...section,
      fields: section.fields.map((f) => (f.id === fieldId ? updatedField : f)),
    })
  }

  const deleteField = (fieldId: string) => {
    onUpdate({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              placeholder="Section Title"
              className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
            />
            <Input
              value={section.description || ''}
              onChange={(e) => onUpdate({ ...section, description: e.target.value })}
              placeholder="Section description (optional)"
              className="text-sm text-muted-foreground border-none px-0 focus-visible:ring-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fields */}
        {section.fields.map((field) => (
          <FieldEditor
            key={field.id}
            field={field}
            onUpdate={(updated) => updateField(field.id, updated)}
            onDelete={() => deleteField(field.id)}
          />
        ))}

        {/* Add Field Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {fieldTypes.map((fieldType) => {
              const Icon = fieldType.icon
              return (
                <DropdownMenuItem key={fieldType.type} onClick={() => addField(fieldType.type)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {fieldType.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Form Builder Props
// ----------------------------------------------------------------------------

interface FormBuilderProps {
  initialForm?: RequestForm
  onSave: (form: Omit<RequestForm, 'id' | 'shareableLink' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  isEditing?: boolean
}

// ----------------------------------------------------------------------------
// Form Builder Component
// ----------------------------------------------------------------------------

export function FormBuilder({ initialForm, onSave, onCancel, isEditing = false }: FormBuilderProps) {
  const [title, setTitle] = useState(initialForm?.title || '')
  const [description, setDescription] = useState(initialForm?.description || '')
  const [sections, setSections] = useState<FormSection[]>(
    initialForm?.sections || [
      {
        id: uuidv4(),
        title: 'Basic Information',
        fields: [],
      },
    ]
  )
  const [isActive, setIsActive] = useState(initialForm?.isActive ?? true)

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: uuidv4(),
        title: 'New Section',
        fields: [],
      },
    ])
  }

  const updateSection = (sectionId: string, updatedSection: FormSection) => {
    setSections(sections.map((s) => (s.id === sectionId ? updatedSection : s)))
  }

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== sectionId))
    } else {
      toast.error('Form must have at least one section')
    }
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Form title is required')
      return
    }

    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0)
    if (totalFields === 0) {
      toast.error('Add at least one field to your form')
      return
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      sections,
      isActive,
    })
  }

  return (
    <div className="space-y-6">
      {/* Form Details */}
      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
          <CardDescription>Basic information about your request form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title *</Label>
            <Input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bot Request Form"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <Textarea
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this form is for..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="form-active"
            />
            <Label htmlFor="form-active" className="cursor-pointer">
              Form is active and accepting responses
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
        
        {sections.map((section) => (
          <SectionEditor
            key={section.id}
            section={section}
            onUpdate={(updated) => updateSection(section.id, updated)}
            onDelete={() => deleteSection(section.id)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? 'Save Changes' : 'Create Form'}
        </Button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Shareable Link Display Component
// ----------------------------------------------------------------------------

interface ShareableLinkProps {
  formId: string
  shareableLink: string
  isActive: boolean
}

export function ShareableLinkDisplay({ formId, shareableLink, isActive }: ShareableLinkProps) {
  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${shareableLink}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Card className={cn(!isActive && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Shareable Link</p>
            <code className="text-sm truncate block bg-muted px-2 py-1 rounded">
              {fullUrl}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => window.open(fullUrl, '_blank')}
              disabled={!isActive}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!isActive && (
          <p className="mt-2 text-xs text-warning">
            This form is currently inactive and not accepting responses
          </p>
        )}
      </CardContent>
    </Card>
  )
}

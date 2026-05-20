// ============================================================================
// JanitorForge - Public Form Page
// Shareable form page for collecting bot requests
// ============================================================================

'use client'

import { useState, useMemo, use } from 'react'
import { 
  Send, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { FormField, FormSection } from '@/lib/types'

// ----------------------------------------------------------------------------
// Sample Form Data (in production, this would come from database)
// ----------------------------------------------------------------------------

const sampleForm = {
  id: 'form-abc123',
  title: 'Bot Request Form',
  description: 'Submit your bot request ideas! I read every submission and try to bring the best ideas to life.',
  isActive: true,
  sections: [
    {
      id: 's1',
      title: 'About You',
      description: 'Let me know who you are',
      fields: [
        { id: 'f1', type: 'text' as const, label: 'Your Name', required: true, placeholder: 'Enter your name or nickname' },
        { id: 'f2', type: 'text' as const, label: 'Discord Username', required: false, placeholder: 'username#0000 (optional)' },
      ],
    },
    {
      id: 's2',
      title: 'Bot Details',
      description: 'Tell me about your bot idea',
      fields: [
        { id: 'f3', type: 'rating-type' as const, label: 'Content Rating', required: true },
        { id: 'f4', type: 'text' as const, label: 'Bot Name', required: true, placeholder: 'What should the character be called?' },
        { id: 'f5', type: 'textarea' as const, label: 'Character Description', required: true, placeholder: 'Describe the character\'s appearance, personality, background...' },
        { id: 'f6', type: 'textarea' as const, label: 'Scenario Ideas', required: false, placeholder: 'Any specific scenarios or settings you\'d like?' },
        { id: 'f7', type: 'tags' as const, label: 'Tropes/Tags', required: false, placeholder: 'e.g., Enemies to Lovers, Fantasy, Slow Burn' },
      ],
    },
    {
      id: 's3',
      title: 'Additional Info',
      fields: [
        { 
          id: 'f8', 
          type: 'select' as const, 
          label: 'Priority', 
          required: false,
          options: ['Low - whenever you have time', 'Medium - would love to see this', 'High - I really want this!'],
        },
        { id: 'f9', type: 'textarea' as const, label: 'Anything else?', required: false, placeholder: 'Any other details or references...' },
      ],
    },
  ],
}

// ----------------------------------------------------------------------------
// Field Renderer Component
// ----------------------------------------------------------------------------

interface FieldRendererProps {
  field: FormField
  value: string | string[]
  onChange: (value: string | string[]) => void
  error?: string
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (tagInput.trim() && Array.isArray(value)) {
      onChange([...value, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    if (Array.isArray(value)) {
      onChange(value.filter(t => t !== tagToRemove))
    }
  }

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && 'border-destructive')}
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(error && 'border-destructive')}
        />
      )

    case 'select':
      return (
        <Select value={value as string} onValueChange={onChange}>
          <SelectTrigger className={cn(error && 'border-destructive')}>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'radio':
      return (
        <RadioGroup value={value as string} onValueChange={onChange}>
          {field.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${field.id}-${option}`} />
              <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${option}`}
                checked={Array.isArray(value) && value.includes(option)}
                onCheckedChange={(checked) => {
                  const currentValues = Array.isArray(value) ? value : []
                  if (checked) {
                    onChange([...currentValues, option])
                  } else {
                    onChange(currentValues.filter(v => v !== option))
                  }
                }}
              />
              <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </div>
      )

    case 'rating-type':
      return (
        <RadioGroup value={value as string} onValueChange={onChange} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SFW" id={`${field.id}-sfw`} />
            <Label htmlFor={`${field.id}-sfw`} className="cursor-pointer">
              <Badge variant="secondary">SFW</Badge>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="NSFW" id={`${field.id}-nsfw`} />
            <Label htmlFor={`${field.id}-nsfw`} className="cursor-pointer">
              <Badge variant="destructive">NSFW</Badge>
            </Label>
          </div>
        </RadioGroup>
      )

    case 'tags':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={field.placeholder}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" variant="secondary" onClick={addTag}>
              Add
            </Button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}

// ----------------------------------------------------------------------------
// Section Renderer Component
// ----------------------------------------------------------------------------

interface SectionRendererProps {
  section: FormSection
  values: Record<string, string | string[]>
  errors: Record<string, string>
  onChange: (fieldId: string, value: string | string[]) => void
}

function SectionRenderer({ section, values, errors, onChange }: SectionRendererProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {section.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <FieldRenderer
              field={field}
              value={values[field.id] || (field.type === 'tags' || field.type === 'checkbox' ? [] : '')}
              onChange={(value) => onChange(field.id, value)}
              error={errors[field.id]}
            />
            {errors[field.id] && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Success State
// ----------------------------------------------------------------------------

function SuccessState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
        <CheckCircle className="h-10 w-10 text-success" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">Request Submitted!</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Thank you for your submission! The creator will review your request soon.
      </p>
      <Link href="/">
        <Button variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to JanitorForge
        </Button>
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Form Not Found State
// ----------------------------------------------------------------------------

function FormNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">Form Not Found</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        This form doesn&apos;t exist or is no longer accepting responses.
      </p>
      <Link href="/">
        <Button variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to JanitorForge
        </Button>
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Public Form Page Component
// ----------------------------------------------------------------------------

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // In production, fetch form by slug from database
  // For demo, use sample form if slug matches
  const form = slug === 'form-abc123' ? sampleForm : null

  const handleChange = (fieldId: string, value: string | string[]) => {
    setValues(prev => ({ ...prev, [fieldId]: value }))
    // Clear error when field is modified
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    form?.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required) {
          const value = values[field.id]
          if (!value || (Array.isArray(value) && value.length === 0)) {
            newErrors[field.id] = 'This field is required'
          }
        }
      })
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSubmitting(true)
    
    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, save to database
    console.log('Form submitted:', values)
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (!form || !form.isActive) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl py-8">
          <FormNotFound />
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl py-8">
          <SuccessState />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 neon-glow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-muted-foreground">{form.description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              values={values}
              errors={errors}
              onChange={handleChange}
            />
          ))}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by JanitorForge
        </p>
      </div>
    </div>
  )
}

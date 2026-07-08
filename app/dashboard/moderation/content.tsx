// ============================================================================
// JanitorForge - Moderation Content Component
// Main moderation interface (used in dashboard)
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { ModerationPanel } from "@/components/dashboard/moderation-panel";
import type { RequestForm } from "@/lib/types";
import { getCurrentUserAccess } from "@/lib/access";
import { cachedBrowserRequest } from "@/lib/browser-request-cache";

export default function ModerationPageContent() {
  const [forms, setForms] = useState<RequestForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async (force = false) => {
    setLoading(true);
    try {
      const result = await cachedBrowserRequest(
        "moderation:forms",
        10_000,
        async () => {
          const supabase = createClient();
          const { user, isAdmin } = await getCurrentUserAccess(supabase);
          const activeUserId = user?.id ?? null;

          if (!user) {
            return {
              ownedForms: [] as RequestForm[],
              activeUserId: null as string | null,
            };
          }

          const query = supabase
            .from("request_forms")
            .select("*")
            .order("created_at", { ascending: false });

          const { data, error } = isAdmin
            ? await query
            : await query.eq("user_id", user.id);

          if (error) {
            throw error;
          }

          return {
            ownedForms: (data || []).map((form: any) => ({
              ...form,
              createdAt: new Date(form.created_at),
              updatedAt: new Date(form.updated_at),
            })) as RequestForm[],
            activeUserId,
          };
        },
        force,
      );

      if (!result.activeUserId) {
        setForms([]);
        setSelectedFormId(null);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(result.activeUserId);
      setForms(result.ownedForms);

      const ownForms = result.activeUserId
        ? result.ownedForms.filter(
            (form) => form.ownerId === result.activeUserId,
          )
        : result.ownedForms;

      setSelectedFormId((currentSelected) => {
        if (
          currentSelected &&
          ownForms.some((form) => form.id === currentSelected)
        ) {
          return currentSelected;
        }

        return ownForms[0]?.id || result.ownedForms[0]?.id || null;
      });
    } catch (error) {
      console.error("Error loading forms:", error);
      setForms([]);
      setSelectedFormId(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  return (
    <div className="p-8 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Form Moderation
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Review and manage flagged submissions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={() => loadForms(true)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Form Selector */}
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading your forms…</p>
          </div>
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No forms found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Form</CardTitle>
              <CardDescription>
                Choose which form's submissions you want to moderate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedFormId || ""}
                onValueChange={setSelectedFormId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Moderation Panel */}
          {selectedForm && (
            <ModerationPanel
              formId={selectedForm.id}
              formTitle={selectedForm.title}
              formOwnerId={selectedForm.ownerId ?? null}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}

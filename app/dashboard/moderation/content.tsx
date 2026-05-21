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

export default function ModerationPageContent() {
  const [forms, setForms] = useState<RequestForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setForms([]);
        setSelectedFormId(null);
        return;
      }

      const { data, error } = await supabase
        .from("request_forms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load forms:", error);
        return;
      }

      const ownedForms = (data || []).map((form: any) => ({
        ...form,
        createdAt: new Date(form.created_at),
        updatedAt: new Date(form.updated_at),
      }));

      setForms(ownedForms);

      setSelectedFormId((currentSelected) => {
        if (
          currentSelected &&
          ownedForms.some((form) => form.id === currentSelected)
        ) {
          return currentSelected;
        }

        return ownedForms[0]?.id || null;
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-shield/10">
            <Shield className="h-6 w-6 text-shield" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Form Moderation</h1>
            <p className="text-sm text-muted-foreground">
              Review and manage flagged submissions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={loadForms}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Form Selector */}
      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading your forms...
          </CardContent>
        </Card>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
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
            />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// JanitorForge - Application Store
// Client-side state management using React Context
// ============================================================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  Bot,
  BotFormData,
  RequestForm,
  Request,
  RequestStatus,
  NavigationView,
} from "./types";
import { getCurrentUserAccess } from "./access";

const validNavigationViews: NavigationView[] = [
  "dashboard",
  "bots",
  "forms",
  "requests",
  "moderation",
  "feedback",
  "atlas",
];

function toNavigationView(value: string | null): NavigationView | null {
  if (!value) return null;
  if (value === "release-generator") return "atlas";

  return validNavigationViews.includes(value as NavigationView)
    ? (value as NavigationView)
    : null;
}

// ----------------------------------------------------------------------------
// Store State Interface
// ----------------------------------------------------------------------------

interface StoreState {
  // Navigation
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;

  // Bots
  bots: Bot[];
  addBot: (data: BotFormData) => Bot;
  upsertBot: (bot: Bot) => void;
  updateBot: (id: string, data: Partial<BotFormData>) => void;
  deleteBot: (id: string) => void;
  getBot: (id: string) => Bot | undefined;

  // Forms
  forms: RequestForm[];
  addForm: (
    form: Omit<RequestForm, "id" | "shareableLink" | "createdAt" | "updatedAt">,
  ) => RequestForm;
  upsertForm: (form: RequestForm) => void;
  updateForm: (id: string, data: Partial<RequestForm>) => void;
  deleteForm: (id: string) => void;
  getForm: (id: string) => RequestForm | undefined;

  // Requests
  requests: Request[];
  addRequest: (
    request: Omit<Request, "id" | "createdAt" | "updatedAt">,
  ) => Request;
  updateRequestStatus: (
    id: string,
    status: RequestStatus,
    notes?: string,
  ) => void;
  deleteRequest: (id: string) => void;
  getRequestsByFormId: (formId: string) => Request[];
  getRequestsByStatus: (status: RequestStatus) => Request[];

  // UI State
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
  selectedFormId: string | null;
  setSelectedFormId: (id: string | null) => void;
}

// ----------------------------------------------------------------------------
// Context Creation
// ----------------------------------------------------------------------------

const StoreContext = createContext<StoreState | null>(null);

// No sample data: the store starts empty and components must handle empty states.
// ----------------------------------------------------------------------------
// Store Provider Component
// ----------------------------------------------------------------------------

export function StoreProvider({ children }: { children: ReactNode }) {
  // Navigation state - load from localStorage or default to dashboard
  const [currentView, setCurrentViewState] =
    useState<NavigationView>("dashboard");

  // Wrapper to persist navigation to localStorage
  const setCurrentView = useCallback((view: NavigationView) => {
    setCurrentViewState(view);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentView", view);
    }
  }, []);

  // Data state (start empty; fetch from Supabase on mount)
  const [bots, setBots] = useState<Bot[]>([]);
  const [forms, setForms] = useState<RequestForm[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Load saved view from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("currentView");
      const normalizedSavedView = toNavigationView(savedView);
      if (savedView) {
        setCurrentViewState(normalizedSavedView ?? "dashboard");
      }
    }
  }, []);

  // Try to load real data from Supabase on client mount. Fall back to sample data on error.
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // Get current authenticated user; if not authenticated, do not fetch private data.
        const { user, isAdmin } = await getCurrentUserAccess(supabase);

        if (!mounted) return;

        if (!user) {
          // Not signed in: don't fetch or expose any user-scoped lists.
          setBots([]);
          setForms([]);
          setRequests([]);
          return;
        }

        // Fetch only data belonging to the authenticated user
        const formsQuery = isAdmin
          ? supabase.from("request_forms").select("*")
          : supabase.from("request_forms").select("*").eq("user_id", user.id);
        const requestsQuery = isAdmin
          ? supabase.from("requests").select("*")
          : supabase.from("requests").select("*").eq("user_id", user.id);
        const [
          { data: botsData, error: botsError },
          { data: formsData, error: formsError },
          { data: requestsData, error: requestsError },
        ] = await Promise.all([
          supabase.from("bots").select("*").eq("user_id", user.id),
          formsQuery,
          requestsQuery,
        ]);

        if (botsError) throw botsError;
        if (formsError) throw formsError;
        if (requestsError) throw requestsError;

        // Map rows to app types
        if (Array.isArray(botsData) && botsData.length > 0) {
          setBots(
            botsData.map((r: any) => ({
              id: r.id,
              ownerId: r.user_id || undefined,
              name: r.name,
              chatName: r.chat_name || undefined,
              shortDescription: r.short_description || "",
              personality: r.personality || "",
              firstMessage: r.first_message || "",
              alternateGreetings: Array.isArray(r.alternate_greetings)
                ? r.alternate_greetings
                : [],
              scenario: r.scenario || "",
              exampleDialogues: r.example_dialogues || "",
              tags: Array.isArray(r.tags) ? r.tags : [],
              rating: r.rating === "NSFW" ? "NSFW" : "SFW",
              imageUrl: r.image_url || undefined,
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
            })),
          );
        }

        if (Array.isArray(formsData) && formsData.length > 0) {
          setForms(
            formsData.map((r: any) => ({
              id: r.id,
              ownerId: r.user_id || undefined,
              title: r.title,
              description: r.description || "",
              sections: r.sections || [],
              appearance: r.appearance || undefined,
              shareableLink: r.shareable_link || "",
              isActive: !!r.is_active,
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
            })),
          );
        }

        if (Array.isArray(requestsData) && requestsData.length > 0) {
          setRequests(
            requestsData.map((r: any) => ({
              id: r.id,
              formId: r.form_id,
              ownerId: r.user_id || undefined,
              formTitle: r.form_title,
              status: r.status,
              submitterName: r.submitter_name,
              responses: r.responses || {},
              responseLabels: r.response_labels || {},
              notes: r.notes,
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
            })),
          );
        }
      } catch (err: unknown) {
        // If anything goes wrong (no env, network, or permissions), log and leave store empty
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? (err as any).message
            : String(err);
        console.info("Supabase load failed:", msg);
        setBots([]);
        setForms([]);
        setRequests([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // UI state
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Bot operations
  const addBot = useCallback((data: BotFormData): Bot => {
    const newBot: Bot = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setBots((prev) => [...prev, newBot]);
    return newBot;
  }, []);

  const upsertBot = useCallback((bot: Bot) => {
    setBots((prev) => {
      const exists = prev.some((b) => b.id === bot.id);
      if (exists) return prev.map((b) => (b.id === bot.id ? bot : b));
      return [...prev, bot];
    });
  }, []);

  const updateBot = useCallback((id: string, data: Partial<BotFormData>) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.id === id ? { ...bot, ...data, updatedAt: new Date() } : bot,
      ),
    );
  }, []);

  const deleteBot = useCallback((id: string) => {
    setBots((prev) => prev.filter((bot) => bot.id !== id));
  }, []);

  const getBot = useCallback(
    (id: string) => {
      return bots.find((bot) => bot.id === id);
    },
    [bots],
  );

  // Form operations
  const addForm = useCallback(
    (
      formData: Omit<
        RequestForm,
        "id" | "shareableLink" | "createdAt" | "updatedAt"
      >,
    ): RequestForm => {
      const newForm: RequestForm = {
        id: uuidv4(),
        ...formData,
        shareableLink: `form-${uuidv4().slice(0, 8)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setForms((prev) => [...prev, newForm]);
      return newForm;
    },
    [],
  );

  const upsertForm = useCallback((form: RequestForm) => {
    setForms((prev) => {
      const exists = prev.some((f) => f.id === form.id);
      if (exists) return prev.map((p) => (p.id === form.id ? form : p));
      return [...prev, form];
    });
  }, []);

  const updateForm = useCallback((id: string, data: Partial<RequestForm>) => {
    setForms((prev) =>
      prev.map((form) =>
        form.id === id ? { ...form, ...data, updatedAt: new Date() } : form,
      ),
    );
  }, []);

  const deleteForm = useCallback((id: string) => {
    setForms((prev) => prev.filter((form) => form.id !== id));
  }, []);

  const getForm = useCallback(
    (id: string) => {
      return forms.find((form) => form.id === id);
    },
    [forms],
  );

  // Request operations
  const addRequest = useCallback(
    (requestData: Omit<Request, "id" | "createdAt" | "updatedAt">): Request => {
      const newRequest: Request = {
        id: uuidv4(),
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRequests((prev) => [...prev, newRequest]);
      return newRequest;
    },
    [],
  );

  const updateRequestStatus = useCallback(
    async (id: string, status: RequestStatus, notes?: string) => {
      // Update UI immediately
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? {
                ...req,
                status,
                notes: notes ?? req.notes,
                updatedAt: new Date(),
              }
            : req,
        ),
      );

      // Update in Supabase in the background
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase
          .from("requests")
          .update({
            status,
            notes: notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Error updating request status:", error);
        }
      } catch (err) {
        console.error("Failed to update request status in Supabase:", err);
      }
    },
    [],
  );

  const deleteRequest = useCallback(async (id: string) => {
    // Remove from UI immediately
    setRequests((prev) => prev.filter((req) => req.id !== id));

    // Delete from Supabase in the background
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("requests").delete().eq("id", id);

      if (error) {
        console.error("Error deleting request:", error);
        // Optionally: reload requests on error
      }
    } catch (err) {
      console.error("Failed to delete request from Supabase:", err);
    }
  }, []);

  const getRequestsByFormId = useCallback(
    (formId: string) => {
      return requests.filter((req) => req.formId === formId);
    },
    [requests],
  );

  const getRequestsByStatus = useCallback(
    (status: RequestStatus) => {
      return requests.filter((req) => req.status === status);
    },
    [requests],
  );

  const value: StoreState = {
    currentView,
    setCurrentView,
    bots,
    addBot,
    upsertBot,
    updateBot,
    deleteBot,
    getBot,
    forms,
    addForm,
    upsertForm,
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
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Custom Hook for accessing the store
// ----------------------------------------------------------------------------

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

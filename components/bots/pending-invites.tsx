// ============================================================================
// JanitorForge - Pending Collaboration Invites
// Shows pending collaboration invites and allows accept/decline
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Check,
  X,
  Loader2,
  Crown,
  Eye,
  Pencil,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMyPendingInvites,
  respondToInvite,
} from "@/app/actions/collaboration";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CollaboratorRole = "viewer" | "editor" | "co_owner";

interface PendingInvite {
  id: string;
  bot_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: string;
  created_at: string;
  bot?: { name: string | null } | null;
  inviter?: { username: string | null; display_name: string | null } | null;
}

const roleConfig: Record<
  CollaboratorRole,
  { label: string; icon: typeof Eye; className: string }
> = {
  viewer: {
    label: "Viewer",
    icon: Eye,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  co_owner: {
    label: "Co-owner",
    icon: Crown,
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

export function PendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    const result = await getMyPendingInvites();
    if (result.success) {
      setInvites(result.invites as PendingInvite[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    const result = await respondToInvite(inviteId, accept);
    setRespondingId(null);

    if (result.success) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.success(accept ? "Invite accepted!" : "Invite declined");
    } else {
      toast.error(result.error || "Failed to respond to invite");
    }
  };

  if (loading) {
    return (
      <Card className="border-border/70">
        <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading invites...
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return null; // Don't show anything if no invites
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          Collaboration Invites
          <Badge variant="secondary" className="text-[10px]">
            {invites.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.map((invite) => {
          const roleConf = roleConfig[invite.role];
          const RoleIcon = roleConf.icon;
          const inviterName =
            invite.inviter?.display_name ||
            invite.inviter?.username ||
            "Someone";
          const botName = invite.bot?.name || "a bot";

          return (
            <div
              key={invite.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/70 bg-background/50 p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{inviterName}</span>{" "}
                    <span className="text-muted-foreground">
                      invited you to collaborate on
                    </span>{" "}
                    <span className="font-medium">{botName}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        roleConf.className,
                      )}
                    >
                      <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                      {roleConf.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(invite.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => handleRespond(invite.id, true)}
                  disabled={respondingId === invite.id}
                >
                  {respondingId === invite.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => handleRespond(invite.id, false)}
                  disabled={respondingId === invite.id}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

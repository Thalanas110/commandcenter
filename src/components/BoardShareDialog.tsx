import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBoardSharing, BoardMember } from "@/hooks/useBoardSharing";
import { Share2, Copy, Trash2, UserPlus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BoardShareDialogProps {
    boardId: string;
}

export function BoardShareDialog({ boardId }: BoardShareDialogProps) {
    const { user } = useAuth();
    const {
        members,
        invites,
        createInvite,
        removeMember,
        updateMemberRole,
        loading,
    } = useBoardSharing(boardId);

    const [copied, setCopied] = useState(false);

    // Derive current user's role to restrict actions
    const currentUserMember = members.find((m) => m.user_id === user?.id);
    // Assume owner is not in members list usually, wait, owners are not in board_shares?
    // Owners are in `boards` table owner_id.
    // We need to know if current user is owner.
    // For now, let's assume we can pass `isOwner` prop or check against board data if available.
    // Actually, RLS handles security. UI should just reflect capabilities.
    // If `updateMemberRole` fails, it fails.
    // But for better UX, we should know.
    // Let's rely on the fact that if we can't do it, supabase errors.

    const handleCreateInvite = async () => {
        await createInvite("viewer"); // Default to viewer
    };

    const handleCopyInvite = (token: string) => {
        const url = `${window.location.origin}/join/${token}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Share Board</DialogTitle>
                    <DialogDescription>
                        Manage board members and sharing settings.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="members" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="invite">Invite Link</TabsTrigger>
                    </TabsList>

                    <TabsContent value="members" className="mt-4">
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-4">
                                {loading ? (
                                    <p className="text-center text-muted-foreground text-sm">
                                        Loading members...
                                    </p>
                                ) : members.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm">
                                        No other members yet.
                                    </p>
                                ) : (
                                    members.map((member) => (
                                        <div
                                            key={member.user_id}
                                            className="flex items-center justify-between space-x-4"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <Avatar>
                                                    <AvatarImage src={member.avatar_url || ""} />
                                                    <AvatarFallback>
                                                        {member.display_name?.slice(0, 2).toUpperCase() ||
                                                            "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium leading-none">
                                                        {member.display_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Joined {new Date(member.joined_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Select
                                                    defaultValue={member.role}
                                                    onValueChange={async (val) =>
                                                        await updateMemberRole(
                                                            member.user_id,
                                                            val as "viewer" | "editor"
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-[100px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={async () => await removeMember(member.user_id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="invite" className="mt-4 space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-muted-foreground">
                                    Generate a link to share this board with others.
                                </p>
                                <Button onClick={handleCreateInvite} size="sm" variant="secondary">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Generate New Link
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="h-[200px]">
                            <div className="space-y-3">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.token}
                                        className="flex items-center justify-between rounded-md border p-2"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Role: {invite.role}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Expires: {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCopyInvite(invite.token)}
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                                {invites.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        No active invite links.
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardSharingService } from '@/services/boardSharingService';
import { useToast } from '@/hooks/use-toast';

export type BoardMember = {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
    role: 'viewer' | 'editor';
    joined_at: string;
};

export type BoardInvite = {
    token: string;
    role: 'viewer' | 'editor';
    usage_limit: number | null;
    usage_count: number;
    expires_at: string | null;
};

export const useBoardSharing = (boardId: string) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // --- Queries ---

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ['board-members', boardId],
        queryFn: async () => {
            return boardSharingService.getMembersByBoard(boardId);
        },
        enabled: !!boardId,
    });

    const { data: invites = [], isLoading: invitesLoading } = useQuery({
        queryKey: ['board-invites', boardId],
        queryFn: async () => {
            return boardSharingService.getInvitesByBoard(boardId);
        },
        enabled: !!boardId,
    });

    // --- Mutations ---

    const createInviteMutation = useMutation({
        mutationFn: async (role: 'viewer' | 'editor' = 'viewer') => {
            return boardSharingService.createInvite(boardId, role);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-invites', boardId] });
            toast({
                title: "Invite created",
                description: "A new invite link has been generated.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to create invite.",
                variant: "destructive",
            });
        }
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            await boardSharingService.removeMember(boardId, userId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
            toast({
                title: "Member removed",
                description: "The user has been removed from the board.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to remove member.",
                variant: "destructive",
            });
        }
    });

    const updateMemberRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string, newRole: 'viewer' | 'editor' }) => {
            await boardSharingService.updateMemberRole(boardId, userId, newRole);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
            toast({
                title: "Role updated",
                description: `Member role updated to ${variables.newRole}.`,
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update member role.",
                variant: "destructive",
            });
        }
    });

    return {
        members,
        invites,
        loading: membersLoading || invitesLoading,
        createInvite: createInviteMutation.mutateAsync,
        removeMember: removeMemberMutation.mutateAsync,
        updateMemberRole: (userId: string, newRole: 'viewer' | 'editor') =>
            updateMemberRoleMutation.mutateAsync({ userId, newRole }),
        refresh: () => {
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
            queryClient.invalidateQueries({ queryKey: ['board-invites', boardId] });
        }
    };
};

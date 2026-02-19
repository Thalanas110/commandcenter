import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
            const { data, error } = await supabase
                .from('board_shares')
                .select(`
          shared_with_user_id,
          permission,
          created_at,
          profiles:shared_with_user_id (
            display_name,
            avatar_url
          )
        `)
                .eq('board_id', boardId);

            if (error) throw error;

            return data.map((item: any) => ({
                user_id: item.shared_with_user_id,
                display_name: item.profiles?.display_name || 'Unknown User',
                avatar_url: item.profiles?.avatar_url,
                email: null,
                role: item.permission as 'viewer' | 'editor',
                joined_at: item.created_at,
            })) as BoardMember[];
        },
        enabled: !!boardId,
    });

    const { data: invites = [], isLoading: invitesLoading } = useQuery({
        queryKey: ['board-invites', boardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('board_invites')
                .select('*')
                .eq('board_id', boardId);

            if (error) throw error;
            return data as BoardInvite[];
        },
        enabled: !!boardId,
    });

    // --- Mutations ---

    const createInviteMutation = useMutation({
        mutationFn: async (role: 'viewer' | 'editor' = 'viewer') => {
            const { data, error } = await supabase
                .from('board_invites')
                .insert({
                    board_id: boardId,
                    role,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-invites', boardId] });
            toast({
                title: "Invite created",
                description: "A new invite link has been generated.",
            });
        },
        onError: (error) => {
            console.error('Error creating invite:', error);
            toast({
                title: "Error",
                description: "Failed to create invite.",
                variant: "destructive",
            });
        }
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('board_shares')
                .delete()
                .eq('board_id', boardId)
                .eq('shared_with_user_id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
            toast({
                title: "Member removed",
                description: "The user has been removed from the board.",
            });
        },
        onError: (error) => {
            console.error('Error removing member:', error);
            toast({
                title: "Error",
                description: "Failed to remove member.",
                variant: "destructive",
            });
        }
    });

    const updateMemberRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string, newRole: 'viewer' | 'editor' }) => {
            const { error } = await supabase
                .from('board_shares')
                .update({ permission: newRole })
                .eq('board_id', boardId)
                .eq('shared_with_user_id', userId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
            toast({
                title: "Role updated",
                description: `Member role updated to ${variables.newRole}.`,
            });
        },
        onError: (error) => {
            console.error('Error updating member role:', error);
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

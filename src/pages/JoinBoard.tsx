import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinBoardPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const joinBoard = async () => {
            if (!token) {
                setError("Invalid invite link.");
                setLoading(false);
                return;
            }

            try {
                // First check if user is authenticated
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    // If not logged in, redirect to login with return path
                    // We can't easily join if not logged in. 
                    // Ideally, we'd redirect to login, then back here.
                    // For now, let's just show a message or redirect.
                    // Store return url?
                    const returnUrl = `/join/${token}`;
                    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                    return;
                }

                const { data, error } = await supabase.rpc('join_board_via_token', {
                    _token: token
                });

                if (error) throw error;

                if (data && data.success) {
                    toast({
                        title: "Welcome!",
                        description: "You have successfully joined the board.",
                    });
                    navigate(`/board/${data.board_id}`);
                } else {
                    setError(data?.message || "Failed to join board.");
                }
            } catch (err: any) {
                console.error("Error joining board:", err);
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        };

        joinBoard();
    }, [token, navigate, toast]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Joining board...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Joining Board</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/")} className="w-full">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null; // Should redirect on success
}

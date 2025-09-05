'use client'

import { useState } from "react";
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from "./ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { APIKey } from "./CreateAPIKeys";
import { Button } from "./ui/Button";
import Loader from "./ui/Loader";
import { Trash } from "lucide-react";
import { requestCarbon } from "@/utils/carbon";

function DeleteAPIKeys(
    props: { 
        apiKey: APIKey,
        getAPIKeys: () => Promise<void>,
        secret: string,
        newKey: APIKey | null,
        setNewKey: (newKey: null) => void,
    }
) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { user } = useAuthStore();
    const { toast } = useToast();

    const deleteAPIKey = async () => {
        if (!user ) {
            return;
        }

        setIsLoading(true);
        const response = await requestCarbon(
            props.secret,
            "POST",
            "/customer/api_key/delete",
            {
                "api_key_ids": [props.apiKey.id],
            }
        )

        if (response.status !== 200) {
            toast({
                description: 'API Key Deletion Failed',
            });
        } else {
            if (props.newKey && props.apiKey.id === props.newKey.id) {
                props.setNewKey(null);
            }

            toast({
                description: "API Key Deleted.",
            });
            setIsDialogOpen(false);
            await props.getAPIKeys()
        }
        setIsLoading(false);
    }

    return (
        <div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        <Trash size={15}/>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="pb-2">Delete API Key</DialogTitle>
                        <DialogDescription className="pb-6">
                            Are you sure you want to delete "{props.apiKey.description}"? This API key will not be usable after deletion.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={() => deleteAPIKey()}
                            disabled={isLoading}
                        >
                            {isLoading && <Loader className="mr-2" />}
                            {isLoading ? 'Deleting...' : 'Delete API Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DeleteAPIKeys;
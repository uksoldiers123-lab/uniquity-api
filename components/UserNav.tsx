'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { IoBookOutline } from "react-icons/io5";
import { IoMdHelpCircleOutline } from "react-icons/io";
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { requestCarbon } from '@/utils/carbon';

const supabase = createClient();

type isPaigoEligibleResponse = {
    is_eligible: boolean
}

export default function UserNav(props: {
    secret: string | null
}) {
    const [showBilling, setShowBilling] = useState(false);

    const router = useRouter();
    const { user } = useAuthStore();

    const isPaigoEligible = async () => {
        if (props.secret) {
            const response = await requestCarbon(
                props.secret,
                "GET",
                "/billing/paigo/is_eligible",
            )
            if (response.status == 200) {
                const deserializedResponse: isPaigoEligibleResponse = await response.json()
                setShowBilling(deserializedResponse.is_eligible)
            }
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    useEffect(() => {
        isPaigoEligible()
    }, [props.secret])

    if (!user) {
        return null;
    }

    return (
        <DropdownMenu>
            <Link href="mailto:derek@carbon.ai" className="flex border px-3 hover:bg-gray-50 py-1 rounded-md items-center gap-2"><IoMdHelpCircleOutline /> Help</Link>       
            <Link href="https://docs.carbon.ai" className="flex border px-3 hover:bg-gray-50 py-1 rounded-md items-center gap-2"><IoBookOutline /> Docs</Link>

            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ring ring-slate-200"
                >
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>
                            {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-4" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {user?.email?.split('@')[0]}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <button className="w-full text-start" onClick={() => router.push("/api-keys")}>
                            API Keys
                        </button>
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                        <button className="w-full text-start" onClick={() => router.push("/organization")}>
                            Organization
                        </button>
                    </DropdownMenuItem>

                    {
                        showBilling && (
                            <DropdownMenuItem>
                                <button className="w-full text-start" onClick={() => router.push("/billing")}>
                                    Billing
                                </button>
                            </DropdownMenuItem>
                        )
                    }
                   
                    {/* <DropdownMenuItem>
                        <button onClick={() => router.push("/carbon-connect")}>
                            Carbon Connect
                        </button>
                    </DropdownMenuItem> */}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <button onClick={signOut} className="w-full text-start">
                        Log out
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

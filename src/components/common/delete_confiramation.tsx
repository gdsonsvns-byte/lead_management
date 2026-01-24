import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import Spinner from "../ui/spinner";

interface DeleteConfirmationProps {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

export function DeleteConfirmation({
    open,
    loading = false,
    onClose,
    onConfirm,
    title = "Delete Form",
    description = "Are you sure you want to delete this form? This action cannot be undone.",
}: DeleteConfirmationProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white border-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <Trash2Icon size={18} />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600"
                    >
                        {loading ? <Spinner color="white" /> : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

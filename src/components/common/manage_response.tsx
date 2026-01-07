"use client";
import { FollowUpStatus } from "@/src/app/generated/prisma/enums";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { PlusIcon, X, GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Spinner from "../ui/spinner";
import { useState } from "react";
import toast from "react-hot-toast";
import { MenuItem, TextField } from "@mui/material";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Actions {
    title: string;
    description: string;
    actions: {
        id: string,
        label: string,
        status: FollowUpStatus,
        order: number,
        isDefault: boolean,
    }[]
}
interface NewActions {
    id: string,
    clientId: string;
    label: string,
    status: FollowUpStatus,
    order: number,
    isDefault: boolean,
}

export default function ManageResponse() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const formId = searchParams.get("form_id");
    const hasFormId = !!formId;
    const [actions, setActions] = useState<NewActions[]>([]);

    const addField = () => {
        setActions((prev) => [
            ...prev,
            {
                id: "",
                clientId: crypto.randomUUID(),
                label: "",
                status: FollowUpStatus.PENDING,
                order: prev.length + 1,
                isDefault: true,
            },
        ]);
    };

    const removeField = (indexToRemove: number) => {
        setActions((prev) => {
            const updated = prev.filter((_, i) => i !== indexToRemove);
            return updated.map((field, index) => ({
                ...field,
                order: index + 1,
            }));
        });
    };
    const updateField = (index: number, updates: Partial<NewActions>) => {
        setActions((prev) =>
            prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
        );
    };

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("form_id");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const { data, isLoading, isError } = useQuery<Actions>({
        queryKey: ["view-response", formId],
        queryFn: async () => {
            const res = await axios.get<Actions>(`/api/v1/followup/actions`, {
                params: {
                    form_id: formId,
                },
                withCredentials: true,
            });
            const mappedActions = res.data.actions
                .sort((a: any, b: any) => a.order - b.order)
                .map((f: any) => ({
                    id: f.id,
                    clientId: f.id,
                    label: f.label,
                    status: f.status,
                    order: f.order,
                    isDefault: f.isDefault,
                }));

            setActions(mappedActions);
            return res.data;
        },
        enabled: hasFormId,
        staleTime: 1000 * 60 * 60,
    });

    const { mutateAsync: updateAction, isPending: isUpdating } = useMutation({
        mutationFn: async () => {
            const res = await axios.patch(`/api/v1/followup/actions`, {
                data: {
                    formId: formId,
                    actions: actions,
                },
                withCredentials: true,
            });
            return res.data;
        },
        onSuccess: async () => {
            toast.success("Follow up actions updated successfully");
            await queryClient.invalidateQueries({
                queryKey: ["view-response", formId],
            });
            closeModal();
        },
        onError: (err: AxiosError) => {
            toast.error(
                ((err.response?.data as any)?.error) ?? err.message
            );
        },
    });
    function handleUpdateAction() {
        if (actions.length === 0 || actions[actions.length - 1].label.trim() === "") {
            toast.error("Please fill all the fields");
            return;
        }
        updateAction();
    }

    if (!hasFormId) return null;
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative overflow-hidden">
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>
                <>
                    {isLoading && (
                        <div className="py-10 flex justify-center">
                            <Spinner />
                        </div>
                    )}

                    {isError && (
                        <p className="text-center text-red-600 py-8">
                            Failed to load form details.
                        </p>
                    )}
                    {
                        isUpdating && (
                            <div className="absolute inset-0 flex justify-center items-center bg-black/10 z-5">
                                <Spinner />
                            </div>
                        )
                    }
                </>

                {!isLoading && data && (
                    <div className="p-2">
                        <div className="mb-16">
                            <h2 className="text-2xl font-semibold text-zinc-900">
                                {data.title}
                            </h2>
                            <p className="text-sm text-zinc-600 mt-1">
                                {data.description || "No description provided."}
                            </p>
                        </div>

                        <div className="space-y-6 mt-6">
                            <DndContext
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => {
                                    const { active, over } = event;
                                    if (!over || active.id === over.id) return;

                                    setActions((items) => {
                                        const oldIndex = items.findIndex(
                                            (i) => i.clientId === active.id
                                        );
                                        const newIndex = items.findIndex(
                                            (i) => i.clientId === over.id
                                        );

                                        const reordered = arrayMove(items, oldIndex, newIndex);

                                        return reordered.map((a, idx) => ({
                                            ...a,
                                            order: idx + 1,
                                        }));
                                    });
                                }}
                            >
                                <SortableContext
                                    items={actions.map((a) => a.clientId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {actions.map((action, index) => (
                                        <SortableItem key={action.clientId} id={action.clientId}>
                                            {({ setActivatorNodeRef, attributes, listeners }) => (
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                                                                {index + 1}
                                                            </span>
                                                            <h3 className="font-medium text-gray-700">
                                                                Action #{index + 1}
                                                            </h3>
                                                        </div>

                                                        <button
                                                            onClick={() => removeField(index)}
                                                            className="bg-red-100 text-red-700 p-2 rounded-full hover:bg-red-200 cursor-pointer"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full">
                                                        <span
                                                            ref={setActivatorNodeRef}
                                                            {...attributes}
                                                            {...listeners}
                                                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                                            title="Drag to reorder"
                                                        >
                                                            <GripVertical size={20} />
                                                        </span>

                                                        <div className="flex-1 w-full">
                                                            <TextField
                                                                label="Action Name"
                                                                value={action.label}
                                                                fullWidth
                                                                disabled={action.id !== ""}
                                                                onChange={(e) =>
                                                                    updateField(index, { label: e.target.value })
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex-1 w-full">
                                                            <TextField
                                                                select
                                                                label="Action Status"
                                                                value={action.status}
                                                                fullWidth
                                                                disabled={action.id !== ""}
                                                                onChange={(e) =>
                                                                    updateField(index, {
                                                                        status: e.target.value as FollowUpStatus,
                                                                    })
                                                                }
                                                            >
                                                                {Object.values(FollowUpStatus).map((s) => (
                                                                    <MenuItem key={s} value={s}>
                                                                        {s}
                                                                    </MenuItem>
                                                                ))}
                                                            </TextField>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </SortableItem>
                                    ))}

                                </SortableContext>
                            </DndContext>

                            <div className="flex items-center justify-between mt-10">
                                <h2 className="font-medium text-zinc-800">Actions</h2>

                                <button
                                    className="bg-blue-600 text-white px-4 py-2 rounded-full flex  items-center gap-2"
                                    onClick={addField}
                                >
                                    Add Action <PlusIcon size={16} />
                                </button>
                            </div>

                            {actions.length === 0 && (
                                <p className="text-zinc-500 text-sm mt-3">
                                    No actions added yet. Click &quot;Add Action&quot; above.
                                </p>
                            )}
                        </div>

                        <button
                            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg cursor-pointer"
                            onClick={handleUpdateAction}
                            // onClick={() => console.log(actions, formId)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Spinner color="white" /> : "Save Actions"}
                        </button>

                    </div>
                )}
            </div>
        </section>
    )
}

function SortableItem({
    id,
    children,
}: {
    id: string;
    children: (args: {
        setActivatorNodeRef: (node: HTMLElement | null) => void;
        attributes: any;
        listeners: any;
    }) => React.ReactNode;
}) {
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children({
                setActivatorNodeRef,
                attributes,
                listeners,
            })}
        </div>
    );
}

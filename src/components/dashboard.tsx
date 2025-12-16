'use client';
import { useState } from 'react'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import axios, { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Spinner from './ui/spinner';
import { Phone, Clock, CheckCircle, Eye, AlertCircle, Plus } from "lucide-react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';


export default function DashboardComponent() {
    const allState: string[] = ["all", "pending", "completed", "cancelled",]
    const [currentState, setCurrentState] = useState<string>(allState[1])
    const [paginationModel, setPaginationModel] = useState({ pageSize: 20, page: 0 });

    const { data, isLoading, isError } = useQuery<TodayFollowUpsResponse>({
        queryKey: ["dashboard", paginationModel.page, paginationModel.pageSize, currentState],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/followup`, {
                params: { page: paginationModel.page + 1, limit: paginationModel.pageSize, state: currentState },
                withCredentials: true,
            });
            return res.data;
        },
        retry: 1,
        placeholderData: (old) => old,
    });

    return (
        <div className="w-full">
            <div className="relative mb-5 w-full flex items-center justify-end p-3">
                <Select
                    onValueChange={(val) => setCurrentState(val)}
                    defaultValue={currentState}
                >
                    <SelectTrigger className="w-xs bg-white border-gray-300">
                        <SelectValue placeholder={currentState} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                        <SelectGroup>
                            <SelectLabel>States</SelectLabel>
                            {allState.map((state, idx) => (
                                <SelectItem key={idx} value={state}>
                                    {state}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            {
                isLoading && (
                    <div className="w-full flex justify-center py-20">
                        <Spinner />
                    </div>
                )
            }
            {
                data && data.total === 0 && (
                    <div className="w-full flex justify-center py-20">
                        No Data Available for today
                    </div>
                )
            }

            <div className='relative w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {data?.today.map(item => (
                    <FollowUpCard key={item.id} item={item}
                        page={paginationModel.page}
                        pageSize={paginationModel.pageSize}
                        currentState={currentState}
                    />
                ))}
            </div>
            <Toaster />
        </div>
    )
}

function extractLeadInfo(response: ResponseDetails) {
    const answers = response.answers;
    const info: Record<string, string> = {};

    answers.forEach(ans => {
        const label = ans.field?.label?.toLowerCase() || "";
        const value = ans.value;
        if (!value) return;

        if (label.includes("name")) info.name = value;
        else if (label.includes("phone") || label.includes("mobile")) info.phone = value;
        else if (label.includes("email")) info.email = value;
        else if (label.includes("location") || label.includes("city")) info.location = value;
        else info[label] = value;
    });

    return info;
}
const CLOSED_BUSINESS_STATUSES = ["Client Converted", "Client not Interested"];
const BUSINESS_STATUSES = [
    "Client Converted",
    "Client will Call",
    "Client will Visit",
    "Client will Message",
    "Call Client",
    "Message Client",
    "Visit Client",
    "Put on Backburner",
    "Client not Interested",
];
const FOLLOWUP_TYPES = [
    { value: "NOTE", label: "Note" },
    { value: "CALL", label: "Phone Call" },
    { value: "EMAIL", label: "Sent Email" },
    { value: "WHATSAPP", label: "WhatsApp Message" },
    { value: "MEETING", label: "Meeting" },
    { value: "STATUS_CHANGE", label: "Status Change" },
];
function FollowUpCard({ item, page, pageSize, currentState }: { item: FollowUpItem, page: number, pageSize: number, currentState: string }) {
    const [openResponse, setOpenResponse] = useState<FollowUpItem | null>(null);
    const [followType, setFollowType] = useState<string>("NOTE");
    const [followNote, setFollowNote] = useState<string>("");
    const [followNextDate, setFollowNextDate] = useState<string>("");
    const [followBusinessStatus, setFollowBusinessStatus] = useState<string>("");
    const info = extractLeadInfo(item.response);
    const queryClient = useQueryClient();

    const due = new Date(item?.nextFollowUpDate);
    const today = new Date();

    const dueDate = new Date(due);
    const todayDate = new Date(today);

    dueDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);

    const isToday = dueDate.getTime() === todayDate.getTime();
    const isOverdue = dueDate.getTime() < todayDate.getTime();
    let tag = "UPCOMING";
    let tagStyle = "bg-blue-100 text-blue-700";

    if (isToday) {
        tag = "TODAY";
        tagStyle = "bg-yellow-100 text-yellow-700";
    } else if (isOverdue) {
        tag = "OVERDUE";
        tagStyle = "bg-red-100 text-red-700";
    }


    const maxDays = 7;
    const diffDays = Math.max(
        0,
        Math.min(maxDays, Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    );
    const progress = Math.round(((maxDays - diffDays) / maxDays) * 100);

    const addFollowUpMutation = useMutation({
        mutationFn: async (payload: {
            responseId: string;
            type: string;
            note?: string | null;
            nextFollowUpDate?: string | null;
            businessStatus: string;
        }) => {
            const res = await axios.post("/api/v1/followup", payload, { withCredentials: true });
            return res.data;
        },
        onSuccess: async (_, payload) => {
            toast.success("Follow-up added");
            await queryClient.invalidateQueries({
                queryKey: ["dashboard", page, pageSize, currentState],
            });
            setFollowNote("");
            setFollowNextDate("");
            setFollowType("NOTE");
            setFollowBusinessStatus("");
        },
        onError: (err: AxiosError) => {
            console.log(
                "Follow-up creation failed:",
                ((err.response?.data as any)?.error) ?? err.message
            );
            toast.error(((err.response?.data as any)?.error) ?? err.message);
        },
    });

    const handleAddFollowUp = () => {
        if (!openResponse) return;
        if (!followBusinessStatus) {
            toast.error("Please choose a business status");
            return;
        }

        addFollowUpMutation.mutate({
            responseId: openResponse.responseId,
            type: followType,
            note: followNote || null,
            nextFollowUpDate: followNextDate || null,
            businessStatus: followBusinessStatus,
        });
    };


    return (
        <div className="relative rounded-xl bg-white p-5 shadow-md border border-zinc-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3">

            <div className="flex justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{info.name || "Unknown Lead"}</h2>
                    {info.phone && <p className="text-sm text-gray-600">{info.phone}</p>}
                    {info.email && <p className="text-sm text-gray-600">{info.email}</p>}
                    {info.location && <p className="text-sm text-gray-600">{info.location}</p>}
                </div>

                <span className={`max-h-max px-2 py-1 rounded-full text-xs font-semibold 
                    ${item.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"}`}>
                    {item.status}
                </span>
            </div>

            {item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${tagStyle}`}>
                    {tag}
                </span>
            )}

            <div className="space-y-2 text-sm text-gray-700">
                {item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                    <div className="flex items-center gap-2">
                        <Clock size={16} /> Next: <strong>{due.toLocaleDateString()}</strong>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <AlertCircle size={16} /> Type: <strong>{item.type}</strong>
                </div>

                {item.note && (
                    <p className="text-gray-600 line-clamp-2 mt-5 block">
                        <strong>Note:</strong> {item.note}
                    </p>
                )}
            </div>

            <div>
                <div className="h-2 w-full bg-gray-200 rounded-full">
                    <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{progress}% progress</p>
            </div>
            {
                item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                    <div className="flex gap-2 mt-2">
                        <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg flex items-center justify-center gap-1 hover:bg-blue-700 cursor-pointer"
                            onClick={() => setOpenResponse(item as FollowUpItem)}
                        >
                            <Plus size={15} />
                            Add New Follow Up
                        </button>
                    </div>
                )
            }
            <Dialog open={!!openResponse} onClose={() => setOpenResponse(null)} maxWidth="lg" fullWidth>
                <DialogTitle>View Lead</DialogTitle>

                <DialogContent dividers>
                    {openResponse && (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                label="Follow-Up Type"
                                select
                                value={followType}
                                onChange={(e) => setFollowType(e.target.value)}
                                SelectProps={{ native: true }}
                                fullWidth
                            >
                                {FOLLOWUP_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </TextField>

                            <TextField
                                // label="Lead Status"
                                select
                                value={followBusinessStatus}
                                onChange={(e) => {
                                    setFollowBusinessStatus(e.target.value);
                                    if (CLOSED_BUSINESS_STATUSES.includes(e.target.value)) {
                                        setFollowNextDate("");
                                    }
                                }}
                                SelectProps={{ native: true }}
                                fullWidth
                            >
                                <option value="">Select status</option>
                                {BUSINESS_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </TextField>

                            <TextField
                                label="Note"
                                multiline
                                rows={3}
                                value={followNote}
                                onChange={(e) => setFollowNote(e.target.value)}
                                placeholder="Write note..."
                                fullWidth
                            />

                            {followBusinessStatus && !CLOSED_BUSINESS_STATUSES.includes(followBusinessStatus) && (
                                <TextField
                                    label="Next Follow-Up Date"
                                    type="date"
                                    value={followNextDate}
                                    onChange={(e) => setFollowNextDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            )}

                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleAddFollowUp}
                                sx={{ mt: 1 }}
                                disabled={addFollowUpMutation.isPending || !followBusinessStatus}
                            >
                                {addFollowUpMutation.isPending ? <Spinner color="white" /> : "Add Follow-Up"}
                            </Button>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenResponse(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

interface Field {
    label: string
}
interface Answer {
    id: string;
    responseId: string;
    fieldId: string;
    value: string;
    field: Field
}

interface ResponseDetails {
    id: string;
    formId: string;
    submittedAt: string;
    answers: Answer[];
}

interface AddedBy {
    id: string;
    name: string;
    email: string;
}

interface FollowUpItem {
    id: string;
    responseId: string;
    addedByUserId: string;
    note: string;
    type: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    businessStatus: string;
    nextFollowUpDate: string;
    createdAt: string;
    addedBy: AddedBy;
    response: ResponseDetails;
}

interface TodayFollowUpsResponse {
    success: boolean;
    today: FollowUpItem[];
    page: number;
    limit: number;
    total: number;
    pageCount: number;
    hasMore: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

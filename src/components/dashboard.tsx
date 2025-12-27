'use client';
import { JSX, useEffect, useState } from 'react'
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
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EventIcon from "@mui/icons-material/Event";
import NoteIcon from "@mui/icons-material/Note";

const TYPE_ICONS: Record<string, JSX.Element> = {
    CALL: <LocalPhoneIcon fontSize="small" color="primary" />,
    EMAIL: <EmailIcon fontSize="small" color="primary" />,
    WHATSAPP: <WhatsAppIcon fontSize="small" color="success" />,
    MEETING: <EventIcon fontSize="small" color="secondary" />,
    NOTE: <NoteIcon fontSize="small" color="action" />,
};
interface State {
    key: string,
    status: string
}
const allState: State[] = [
    { key: "All", status: "all" },
    { key: "Pending Till Today", status: "pending_today" },
    { key: "Pending", status: "pending" },
    { key: "Completed", status: "completed" },
    { key: "Cancelled", status: "cancelled" },
]

export default function DashboardComponent() {
    const [currentState, setCurrentState] = useState<string>(allState[1]?.status)
    const [paginationModel, setPaginationModel] = useState({ pageSize: 12, page: 0 });

    const { data, isLoading, isError, isFetching } = useQuery<TodayFollowUpsResponse>({
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

    useEffect(() => {
        setPaginationModel({ pageSize: 12, page: 0 })
    }, [currentState])

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
                                <SelectItem key={idx} value={state.status}>
                                    {state.key}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            {isLoading && (
                <div className="flex justify-center py-20">
                    <Spinner />
                </div>
            )}
            {
                data && data.total === 0 && (
                    <div className="w-full flex justify-center py-20">
                        No Data Available for today
                    </div>
                )
            }

            <div className='relative w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4'>
                {isFetching && !isLoading && (
                    <div className="absolute inset-0 bg-white/60 flex justify-center items-center z-10">
                        <Spinner />
                    </div>
                )}
                {data?.today.map(item => (
                    <FollowUpCard
                        key={item.responseId}
                        item={item}
                        page={paginationModel.page}
                        pageSize={paginationModel.pageSize}
                        currentState={currentState}
                    />
                ))}
            </div>
            {data && data.total > paginationModel.pageSize && (
                <div className="flex items-center gap-4 mt-6 justify-center">
                    <button
                        disabled={!data.prevPage || isFetching}
                        onClick={() => setPaginationModel((p) => ({ ...p, page: p.page - 1 }))}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!data.prevPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Previous
                    </button>

                    <span className="font-medium text-zinc-700">
                        Page {data.page} / {data.pageCount}
                    </span>

                    <button
                        disabled={!data.nextPage || isFetching}
                        onClick={() => setPaginationModel((p) => ({ ...p, page: p.page + 1 }))}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!data.nextPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Next
                    </button>

                </div>
            )}
            <Toaster />
        </div>
    )
}

function extractLeadInfo(response: LeadResponse) {
    const answers = response.answers;
    const info: Record<string, string> = {};

    answers.forEach(ans => {
        const label = ans.field?.label?.toLowerCase() || "";
        const value = ans.value;
        if (!value) return;

        if (label.includes("name") || label.includes("contact person")) info.name = value;
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

interface Props {
    item: DashboardFollowUpItem;
    page: number;
    pageSize: number;
    currentState: string;
}

function FollowUpCard({ item, page, pageSize, currentState }: Props) {
    const [openResponse, setOpenResponse] = useState<DashboardFollowUpItem | null>(null);
    const [followType, setFollowType] = useState<string>("NOTE");
    const [followNote, setFollowNote] = useState<string>("");
    const [followNextDate, setFollowNextDate] = useState<string>("");
    const [followBusinessStatus, setFollowBusinessStatus] = useState<string>("");

    const info = extractLeadInfo(item.response);
    const queryClient = useQueryClient();
    const last = item.lastFollowUp;

    const due = last.nextFollowUpDate
        ? new Date(last.nextFollowUpDate)
        : null;

    const today = new Date();

    let isToday = false;
    let isOverdue = false;

    if (due) {
        const dueDate = new Date(due);
        const todayDate = new Date(today);
        dueDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);

        isToday = dueDate.getTime() === todayDate.getTime();
        isOverdue = dueDate.getTime() < todayDate.getTime();
    }

    let tag = "UPCOMING";
    let tagStyle = "bg-blue-100 text-blue-700";

    if (isToday) {
        tag = "TODAY";
        tagStyle = "bg-yellow-100 text-yellow-700";
    } else if (isOverdue) {
        tag = "OVERDUE";
        tagStyle = "bg-red-100 text-red-700";
    }
    let progress = 0;
    if (due) {
        const maxDays = 7;
        const diffDays = Math.max(
            0,
            Math.min(
                maxDays,
                Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            )
        );
        progress = Math.round(((maxDays - diffDays) / maxDays) * 100);
    }
    const addFollowUpMutation = useMutation({
        mutationFn: async (payload: {
            responseId: string;
            type: string;
            note?: string | null;
            nextFollowUpDate?: string | null;
            businessStatus: string;
        }) => {
            const res = await axios.post("/api/v1/followup", payload, {
                withCredentials: true,
            });
            return res.data;
        },
        onSuccess: async () => {
            toast.success("Follow-up added");
            await queryClient.invalidateQueries({
                queryKey: ["dashboard", page, pageSize, currentState],
            });
            setFollowNote("");
            setFollowNextDate("");
            setFollowType("NOTE");
            setFollowBusinessStatus("");
            setOpenResponse(null);
        },
        onError: (err: AxiosError) => {
            toast.error(
                ((err.response?.data as any)?.error) ?? err.message
            );
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
    useEffect(() => {
        if (!openResponse) return;
        const lastFU = openResponse.followUpHistory?.at(-1) ?? null;
        setFollowType(lastFU?.type ?? "NOTE");
        setFollowNote("");
        setFollowNextDate(lastFU?.nextFollowUpDate ?? "");
        setFollowBusinessStatus(lastFU?.businessStatus ?? "");
    }, [openResponse]);
    const status = last.status;

    return (
        <div className="relative rounded-xl bg-white p-5 shadow-md border border-zinc-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3">

            <div className="flex justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        {info.name || "Unknown Lead"}
                    </h2>
                    {info.phone && <p className="text-sm text-gray-600">{info.phone}</p>}
                    {info.email && <p className="text-sm text-gray-600">{info.email}</p>}
                    {info.location && <p className="text-sm text-gray-600">{info.location}</p>}
                </div>

                <span
                    className={`max-h-max px-2 py-1 rounded-full text-xs font-semibold 
                    ${status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                >
                    {status}
                </span>
            </div>

            {status !== "COMPLETED" && status !== "CANCELLED" && due && (
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${tagStyle}`}>
                    {tag}
                </span>
            )}

            <div className="space-y-2 text-sm text-gray-700">
                {status !== "COMPLETED" && status !== "CANCELLED" && due && (
                    <div className="flex items-center gap-2">
                        <Clock size={16} />
                        Next: <strong>{due.toLocaleDateString()}</strong>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    Status: <strong>{last.businessStatus}</strong>
                </div>

                {last.note && (
                    <p className="text-gray-600 line-clamp-2 mt-2">
                        <strong>Note:</strong> {last.note}
                    </p>
                )}
            </div>

            {due && (
                <div>
                    <div className="h-2 w-full bg-gray-200 rounded-full">
                        <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {progress}% progress
                    </p>
                </div>
            )}

            {status !== "COMPLETED" && status !== "CANCELLED" && (
                <button
                    className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                    onClick={() => setOpenResponse(item)}
                >
                    <Plus size={15} />
                    Add New Follow Up
                </button>
            )}

            <Dialog open={!!openResponse} onClose={() => setOpenResponse(null)} maxWidth="lg" fullWidth>
                <DialogTitle>View Lead</DialogTitle>

                <DialogContent dividers>
                    {openResponse && Object.entries(openResponse?.response.answers).map(([key, val]) => {
                        // const value = typeof val === "string" ? val : JSON.stringify(val);
                        // console.log(JSON.parse(value));

                        return (
                            <Box key={key} mb={0}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    {val.field.label}
                                </Typography>
                                <Typography>{val.value}</Typography>
                            </Box>
                        );
                    })}

                    <DialogTitle>Add Follow-Up</DialogTitle>


                    <Box mt={1} display="flex" flexDirection="column" gap={2}>
                        {openResponse?.followUpHistory.length === 0 && (
                            <Typography>No activity yet.</Typography>
                        )}

                        {openResponse?.followUpHistory.map((f) => {
                            const Icon = TYPE_ICONS[f.type] ?? TYPE_ICONS["NOTE"];

                            return (
                                <Box
                                    key={f.id}
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        p: 2,
                                        background: "white",
                                        borderRadius: 2,
                                        border: "1px solid #eee",
                                        boxShadow: "0px 4px 8px rgba(0,0,0,0.05)",
                                        transition: "0.2s",
                                        "&:hover": { boxShadow: "0px 6px 14px rgba(0,0,0,0.1)" },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 45,
                                            height: 45,
                                            borderRadius: "50%",
                                            backgroundColor: "#f5f5f5",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "inset 0px 0px 5px rgba(0,0,0,0.1)",
                                        }}
                                    >
                                        {Icon}
                                    </Box>

                                    <Box flex={1}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography fontWeight={600}>
                                                {f.addedBy?.name ?? "Someone"}{" "}
                                                <span style={{ fontWeight: 400 }}>
                                                    {f.type === "CALL" && "made a call"}
                                                    {f.type === "EMAIL" && "sent an email"}
                                                    {f.type === "WHATSAPP" && "sent a WhatsApp message"}
                                                    {f.type === "MEETING" && "logged a meeting"}
                                                    {f.type === "STATUS_CHANGE" && "changed status to"}
                                                    {f.type === "NOTE" && "added a note"}
                                                </span>{" "}
                                                {f.type === "STATUS_CHANGE" && (
                                                    <b>{f.businessStatus}</b>
                                                )}
                                            </Typography>

                                            <Chip
                                                label={f.status}
                                                size="small"
                                                color={
                                                    f.status === "COMPLETED"
                                                        ? "success"
                                                        : f.status === "CANCELLED"
                                                            ? "error"
                                                            : "primary"
                                                }
                                            />
                                        </Box>

                                        {f.note && (
                                            <Typography mt={1} variant="body2" >
                                                <b>Summary:</b> {f.note}
                                            </Typography>
                                        )}

                                        <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                                            <Typography variant="body2">
                                                <b>Date:</b> {new Date(f.createdAt).toLocaleString()}
                                            </Typography>

                                            {f.nextFollowUpDate && (
                                                <Typography variant="body2">
                                                    <b>Next Follow-Up:</b>{" "}
                                                    {new Date(f.nextFollowUpDate).toLocaleDateString()}
                                                </Typography>
                                            )}

                                            <Typography variant="body2">
                                                <b>Status set to:</b> {f.businessStatus}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box mt={8} display="flex" flexDirection="column" gap={2}>
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
                            label="Follow Up details"
                            multiline
                            rows={3}
                            value={followNote}
                            onChange={(e) => setFollowNote(e.target.value)}
                            placeholder="Write note..."
                            fullWidth
                        />

                        <TextField
                            label="Next Action"
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

                        {followBusinessStatus &&
                            !CLOSED_BUSINESS_STATUSES.includes(followBusinessStatus) && (
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
                            disabled={addFollowUpMutation.isPending || !followBusinessStatus}
                        >
                            {addFollowUpMutation.isPending ? (
                                <Spinner color="white" />
                            ) : (
                                "Add Follow-Up"
                            )}
                        </Button>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenResponse(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

interface FollowUp {
    id: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    businessStatus: string;
    type: string;
    note: string | null;
    nextFollowUpDate: string | null;
    createdAt: string;
    addedBy: {
        id: string;
        name: string;
        email: string;
    };
}

interface LeadResponse {
    id: string;
    submittedAt: string;
    answers: {
        value: string;
        field: {
            label: string;
        };
    }[];
}

interface DashboardFollowUpItem {
    responseId: string;
    response: LeadResponse;
    lastFollowUp: FollowUp;
    followUpHistory: FollowUp[];
}

interface TodayFollowUpsResponse {
    success: boolean;
    today: DashboardFollowUpItem[];
    page: number;
    limit: number;
    total: number;
    pageCount: number;
    hasMore: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

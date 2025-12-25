"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useMemo, useState, useEffect, JSX } from "react";
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
} from "@mui/lab";

import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridToolbar,
} from "@mui/x-data-grid";

import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    TextField,
    Alert,
    Chip,
} from "@mui/material";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EventIcon from "@mui/icons-material/Event";
import NoteIcon from "@mui/icons-material/Note";
import toast from "react-hot-toast";
import Spinner from "../ui/spinner";

const TYPE_ICONS: Record<string, JSX.Element> = {
    CALL: <LocalPhoneIcon fontSize="small" color="primary" />,
    EMAIL: <EmailIcon fontSize="small" color="primary" />,
    WHATSAPP: <WhatsAppIcon fontSize="small" color="success" />,
    MEETING: <EventIcon fontSize="small" color="secondary" />,
    NOTE: <NoteIcon fontSize="small" color="action" />,
};
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

export interface FormAnswers {
    [key: string]: string;
}
export interface FollowUpItem {
    id: string;
    type: string;
    note: string | null;
    status: string;
    businessStatus: string;
    createdAt: string;
    nextFollowUpDate: string | null;
    addedBy?: {
        id: string;
        name: string;
        email: string;
    };
}
export interface FormResponseItem {
    responseId: string;
    submittedAt: string;
    answers: FormAnswers;
    followUps: FollowUpItem[];
    followUpCount: number;
    lastFollowUp: FollowUpItem | null;
    nextFollowUpDate: string | null;
    leadStatus: string;
}
export interface FormResponsesData {
    id: string;
    formId: string;
    title: string;
    description: string;
    responses: FormResponseItem[];
    page: number;
    limit: number;
    totalResponse: number;
    pageCount: number;
    hasMore: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

export default function UsersData({ formId }: { formId: string }) {
    const STORAGE_KEY = `form_${formId}_column_visibility`;
    const queryClient = useQueryClient();
    const hasFormId = !!formId;
    const allState: string[] = [
        "All",
        "Pending",
        "Completed",
        "Cancelled",
    ]
    const [currentState, setCurrentState] = useState<string>(allState[1])
    const [followType, setFollowType] = useState<string>("NOTE");
    const [followNote, setFollowNote] = useState<string>("");
    const [followNextDate, setFollowNextDate] = useState<string>("");
    const [followBusinessStatus, setFollowBusinessStatus] = useState<string>("");
    const [columnVisibilityModel, setColumnVisibilityModel] = useState<any>({});
    const [openResponse, setOpenResponse] = useState<FormResponseItem | null>(null);
    const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setColumnVisibilityModel(JSON.parse(saved));
    }, [STORAGE_KEY]);

    useEffect(() => {
        if (Object.keys(columnVisibilityModel).length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(columnVisibilityModel));
        }
    }, [columnVisibilityModel, STORAGE_KEY]);

    useEffect(() => {
        if (!openResponse) return;
        const lastFU = openResponse.followUps?.at(-1) ?? null;
        setFollowType(lastFU?.type ?? "NOTE");
        setFollowNote("");
        setFollowNextDate(lastFU?.nextFollowUpDate ?? "");
        setFollowBusinessStatus(lastFU?.businessStatus ?? "");
    }, [openResponse]);


    const { data, isLoading, isError, isFetching } = useQuery<FormResponsesData>({
        queryKey: ["form_responses", formId, paginationModel.page, paginationModel.pageSize, currentState],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/form/${formId}/response`, {
                params: { page: paginationModel.page + 1, limit: paginationModel.pageSize, state: currentState },
                withCredentials: true,
            });
            return res.data;
        },
        enabled: hasFormId,
        retry: 1,
        placeholderData: (old) => old,
    });
    const responses = data?.responses || [];
    const dynamicCols = responses.length ? Object.keys(responses[0].answers) : [];

    const columns: GridColDef[] = useMemo(() => {
        const dynamicFields = dynamicCols.map((key) => ({
            field: key,
            headerName: key,
            flex: 1,
            minWidth: 180,
            sortable: true,
            filterable: true,
            // @ts-ignore
            valueGetter: (value, row) => row?.answers?.[key] ?? "",
            renderCell: (params: GridRenderCellParams) => {
                const v = params.value;
                if (typeof v === "string" && v.startsWith("http")) {
                    return <a href={v} target="_blank" rel="noreferrer">File</a>;
                }
                if (typeof v === "string" && v.startsWith("[")) {
                    return JSON.parse(v).join(", ");
                }
                return v;
            }
        }));

        return [
            {
                field: "_index", headerName: "#", width: 70, sortable: false,
                valueGetter: (value, row) => row.idx
            },
            ...dynamicFields,
            {
                field: "submittedAt",
                headerName: "Submitted",
                width: 200,
                valueGetter: (value, row) => new Date(row?.submittedAt).toLocaleString(),
            },
            {
                field: "followUpCount",
                headerName: "Follow Ups",
                width: 130,
                valueGetter: (value, row) => row.followUpCount,
            },

            {
                field: "leadStatus",
                headerName: "Status",
                width: 140,
                sortable: true,
                renderCell: (params: GridRenderCellParams) => {
                    const status = params.row.leadStatus;
                    const color =
                        status === "COMPLETED"
                            ? "success"
                            : status === "CANCELLED"
                                ? "error"
                                : "warning";

                    return (
                        <Chip
                            label={status}
                            color={color}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    );
                },
            },

        ];
    }, [dynamicCols, responses]);

    if (!hasFormId) return null;

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
                queryKey: ["form_responses", formId, paginationModel.page, paginationModel.pageSize],
            });
            const updated = await axios.get(`/api/v1/form/${formId}/response`, {
                params: { page: paginationModel.page + 1, limit: paginationModel.pageSize },
                withCredentials: true,
            });
            const updatedRow: FormResponseItem | undefined = updated.data.responses.find(
                (r: FormResponseItem) => r.responseId === payload.responseId
            );
            if (updatedRow) setOpenResponse(updatedRow);
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

        const lastFU = openResponse.followUps.at(-1);
        if (lastFU && CLOSED_BUSINESS_STATUSES.includes(lastFU.businessStatus)) {
            toast.error("No further follow-ups allowed for this lead");
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
        <div className="w-full overflow-hidden">
            <div className="flex justify-between items-center mb-5">
                <h1 className="font-bold text-zinc-800 text-xl">{data?.title ? `Responses of ${data.title}` : "Responses"}</h1>
            </div>

            <div className="relative my-5 w-full flex items-center justify-end p-3">
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
            {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-white/60 flex justify-center items-center z-10">
                    <Spinner />
                </div>
            )}
            <DataGrid
                showToolbar
                rows={responses}
                columns={columns}
                getRowId={(row) => row.responseId}
                loading={isLoading}
                autoHeight
                disableRowSelectionOnClick
                getRowHeight={() => "auto"}
                columnVisibilityModel={columnVisibilityModel}
                onColumnVisibilityModelChange={setColumnVisibilityModel}
                onRowClick={(params) => setOpenResponse(params.row as FormResponseItem)}
                paginationMode="server"
                rowCount={data?.totalResponse || 0}
                paginationModel={paginationModel}
                onPaginationModelChange={(newModel) => setPaginationModel(newModel)}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
                sx={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: 3,
                    "& .MuiDataGrid-cell": { py: 2 },
                }}
            />

            <Dialog open={!!openResponse} onClose={() => setOpenResponse(null)} maxWidth="lg" fullWidth>
                <DialogTitle>View Lead</DialogTitle>

                <DialogContent dividers>
                    {openResponse && (
                        <>
                            {Object.entries(openResponse.answers).map(([key, val]) => {
                                const value = typeof val === "string" ? val : JSON.stringify(val);
                                return (
                                    <Box key={key} mb={0}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {key}
                                        </Typography>
                                        <Typography>{value}</Typography>
                                    </Box>
                                );
                            })}

                            <Box mt={3} display="flex" flexDirection="column" gap={2}>
                                {openResponse.followUps.length === 0 && (
                                    <Typography>No activity yet.</Typography>
                                )}

                                {openResponse.followUps.map((f) => {
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

                                                {/* Extra Details */}
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

                            {
                                openResponse && openResponse.leadStatus !== "COMPLETED" && openResponse.leadStatus !== "CANCELLED" && (
                                    <Box mt={4} p={3} sx={{ border: "1px solid #ddd", borderRadius: 2, background: "#fafafa" }}>
                                        <Typography variant="h6" gutterBottom>
                                            Add New Follow-Up
                                        </Typography>

                                        {(() => {
                                            const lastFU = openResponse.followUps.at(-1);
                                            if (lastFU && CLOSED_BUSINESS_STATUSES.includes(lastFU.businessStatus)) {
                                                return <Alert severity="info">This lead is marked as <b>{lastFU.businessStatus}</b>. No further follow-ups can be added.</Alert>;
                                            }

                                            return (
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
                                            );
                                        })()}
                                    </Box>
                                )
                            }
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenResponse(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
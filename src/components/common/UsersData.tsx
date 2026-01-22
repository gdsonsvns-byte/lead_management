"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useMemo, useState, useEffect, JSX, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";

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
    Input,
    MenuItem,
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
import toast, { Toaster } from "react-hot-toast";
import Spinner from "../ui/spinner";
import { useAuth } from "@/src/hooks/useAuth";

const TYPE_ICONS: Record<string, JSX.Element> = {
    CALL: <LocalPhoneIcon fontSize="small" color="primary" />,
    EMAIL: <EmailIcon fontSize="small" color="primary" />,
    WHATSAPP: <WhatsAppIcon fontSize="small" color="success" />,
    MEETING: <EventIcon fontSize="small" color="secondary" />,
    NOTE: <NoteIcon fontSize="small" color="action" />,
};
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
export interface NextActionType {
    id: string;
    label: string;
    status: string;
}
export interface FormResponseItem {
    responseId: string;
    submittedAt: string;
    nextActions: NextActionType[];
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
export default function UsersData({ formId, account_id }: { formId: string, account_id?: string }) {
    const { user } = useAuth();
    const isAdmin = user && (user?.role === "ADMIN" || user?.role === "SUPERADMIN");
    const STORAGE_KEY = `form_${formId}_column_visibility`;
    const queryClient = useQueryClient();
    const hasFormId = !!formId;
    const router = useRouter();
    const [currentState, setCurrentState] = useState<string>(allState[1].status)
    const [followType, setFollowType] = useState<string>("NOTE");
    const [followNote, setFollowNote] = useState<string>("");
    const [followNextDate, setFollowNextDate] = useState<string>("");
    const [followBusinessStatus, setFollowBusinessStatus] = useState<string>("");
    const [columnVisibilityModel, setColumnVisibilityModel] = useState<any>({});
    const [openResponse, setOpenResponse] = useState<FormResponseItem | null>(null);
    const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
    const [reportData, setReportData] = useState<string>(new Date().toISOString().split("T")[0]);
    const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setColumnVisibilityModel(JSON.parse(saved));
    }, [STORAGE_KEY]);
    useEffect(() => {
        setPaginationModel({ pageSize: 10, page: 0 })
    }, [currentState])
    useEffect(() => {
        if (Object.keys(columnVisibilityModel).length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(columnVisibilityModel));
        }
    }, [columnVisibilityModel, STORAGE_KEY]);

    useEffect(() => {
        if (!openResponse) return;
        setFollowType("NOTE");
        setFollowNote("");
        setFollowNextDate("");
        setFollowBusinessStatus("");
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
            ...(isAdmin
                ? [{
                    field: "assign_user",
                    headerName: "Assign User",
                    width: 120,
                    sortable: false,
                    renderCell: (params: GridRenderCellParams) => {
                        const responseId = params.row.responseId;
                        return (
                            <Button
                                size="small"
                                variant="contained"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedResponseId(responseId);
                                }}
                            >
                                Assign
                            </Button>
                        );
                    },
                }]
                : []),
            ...dynamicFields,
            {
                field: "submittedAt",
                headerName: "Submitted",
                width: 220,
                sortable: true,
                renderCell: (params: GridRenderCellParams) => {
                    const row = params.row;
                    const date = row?.submittedAt
                        ? new Date(row.submittedAt).toLocaleString()
                        : "-";
                    const addedByName = row?.followUps?.[0]?.addedBy?.name ?? null;

                    return (
                        <div style={{ lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 500 }}>{date}</div>
                            {addedByName && (
                                <div style={{ fontSize: 12, color: "#666" }}>
                                    ({addedByName})
                                </div>
                            )}
                        </div>
                    );
                },
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
            status: string;
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

        if (openResponse && (openResponse.leadStatus === "COMPLETED" || openResponse.leadStatus === "CANCELLED")) {
            toast.error("No further follow-ups allowed for this lead");
            return;
        }

        addFollowUpMutation.mutate({
            responseId: openResponse.responseId,
            type: followType,
            note: followNote || null,
            nextFollowUpDate: followNextDate || null,
            businessStatus: followBusinessStatus,
            status: openResponse && openResponse.nextActions?.find((a) => a.label === followBusinessStatus)?.status!,
        });
    };

    const selectedAction = useMemo(
        () =>
            openResponse?.nextActions?.find(
                (a) => a.label === followBusinessStatus
            ),
        [openResponse?.nextActions, followBusinessStatus]
    );

    return (
        <div className="w-full overflow-hidden">
            <div className="flex justify-between items-center mb-5">
                <h1 className="font-bold text-zinc-800 text-xl">{data?.title ? `Responses of ${data.title}` : "Responses"}</h1>
            </div>

            <div className="relative my-5 w-full flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex flex-col items-start gap-5">
                    <span className="text-zinc-800 font-semibold">
                        Follow Up Report
                    </span>
                    <div className="flex items-center justify-between gap-2">
                        <input
                            type="date"
                            value={reportData}
                            onChange={(e) => setReportData(e.target.value)}
                            className="border border-gray-300 rounded-md p-1.5" />
                        <Button
                            className="text-sm md:text-base"
                            variant="contained"
                            onClick={() => router.push(`report?id=${formId}&date=${reportData}`)}
                            disabled={reportData === ""}
                        >
                            View Report
                        </Button>
                    </div>
                </div>
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
                                            const lastFU = openResponse.lastFollowUp;
                                            if (lastFU && (openResponse.leadStatus === "COMPLETED" || openResponse.leadStatus === "CANCELLED")) {
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
                                                        InputLabelProps={{ shrink: true }}
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
                                                        InputLabelProps={{ shrink: true }}
                                                        fullWidth
                                                    />


                                                    <TextField
                                                        label="Next Action"
                                                        select
                                                        value={followBusinessStatus}
                                                        InputLabelProps={{ shrink: true }}
                                                        onChange={(e) => {
                                                            const selectedLabel = e.target.value;
                                                            setFollowBusinessStatus(selectedLabel);

                                                            const selectedAction = openResponse.nextActions.find(
                                                                (a) => a.label === selectedLabel
                                                            );

                                                            if (
                                                                selectedAction?.status === "COMPLETED" ||
                                                                selectedAction?.status === "CANCELLED"
                                                            ) {
                                                                setFollowNextDate("");
                                                            }
                                                        }}
                                                        SelectProps={{ native: true }}
                                                        fullWidth
                                                    >
                                                        <option value="">Select Next Action</option>
                                                        {openResponse.nextActions.map((s) => (
                                                            <option key={s.id} value={s.label} className={`${s.status === "COMPLETED" ? "text-green-600" : s.status === "CANCELLED" ? "text-red-600" : "text-zinc-600"} font-medium`}>
                                                                {s.label}
                                                            </option>
                                                        ))}
                                                    </TextField>

                                                    {followBusinessStatus &&
                                                        selectedAction &&
                                                        selectedAction.status !== "COMPLETED" &&
                                                        selectedAction.status !== "CANCELLED" && (
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
                                                        disabled={addFollowUpMutation.isPending || !followBusinessStatus || openResponse.leadStatus === "COMPLETED" || openResponse.leadStatus === "CANCELLED"}
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
            <AssignUserDialog
                open={!!selectedResponseId}
                onClose={() => setSelectedResponseId(null)}
                formId={formId}
                responseId={selectedResponseId}
                account_id={account_id}
            />
            <Toaster />
        </div>
    );
}
interface Props {
    open: boolean;
    onClose: () => void;
    formId: string;
    responseId: string | null;
    account_id?: string;
}
function AssignUserDialog({ open, onClose, formId, responseId, account_id }: Props) {
    const { data, isLoading, isError, isFetching } = useQuery<User[]>({
        queryKey: ["responses", formId, responseId, account_id],
        queryFn: async () => {
            const res = await axios.get<User[]>(`/api/v1/form/users`, {
                params: { account_id: account_id ?? "", form_id: formId },
                withCredentials: true,
            });
            return res.data;
        },
        enabled: open,
        retry: 1,
        placeholderData: (old) => old,
    });
    const [assignUserId, setAssignUserId] = useState<string>("");

    const assignUserMutation = useMutation({
        mutationFn: async () => {
            const res = await axios.post(`/api/v1/form/response/assign`, {
                form_id: formId,
                response_id: responseId,
                user_id: assignUserId,
            }, {
                withCredentials: true,
            });
            return res.data;
        },
        onSuccess: () => {
            onClose();
            setAssignUserId("");
            toast.success("User assigned successfully");
        },
    });

    const handleAssignUser = () => {
        // assignUserMutation.mutate();
        console.log(assignUserId, formId, responseId);
    };

    return (
        <Dialog open={open} onClose={() => { onClose(), setAssignUserId("") }} maxWidth="sm" fullWidth>
            <DialogTitle>Assign User</DialogTitle>
            {isLoading && (
                <div className="py-10 flex justify-center">
                    <Spinner />
                </div>
            )}
            {!isLoading && data &&
                <>
                    <DialogContent>
                        <div className="flex flex-col sm:flex-row gap-5 mt-10">
                            <TextField
                                label="Assign to"
                                select
                                value={assignUserId}
                                onChange={(e) => setAssignUserId(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                SelectProps={{
                                    displayEmpty: true,
                                }}
                            >
                                <MenuItem value="">
                                    <em>Select User</em>
                                </MenuItem>

                                {data && data.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        <div className="flex w-full items-center justify-between gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-800">
                                                    {user.name}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {user.email}
                                                </span>
                                            </div>

                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full border font-medium not-visited:${user.role === "ADMIN"
                                                    ? "border-blue-500 text-blue-600"
                                                    : user.role === "MANAGER"
                                                        ? "border-green-500 text-green-600"
                                                        : "border-zinc-400 text-zinc-600"
                                                    }`}
                                            >
                                                {user.role}
                                            </span>
                                        </div>
                                    </MenuItem>
                                ))}
                            </TextField>

                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { onClose(), setAssignUserId("") }}>Close</Button>
                        <Button variant="contained" onClick={handleAssignUser}>
                            {assignUserMutation.isPending ? <Spinner color="white" /> : "Assign"}
                        </Button>
                    </DialogActions>
                </>
            }
        </Dialog>
    );
}


interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}   
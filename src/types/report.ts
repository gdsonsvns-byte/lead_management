export type FollowUpType =
    | "CALL"
    | "EMAIL"
    | "WHATSAPP"
    | "MEETING"
    | "NOTE"
    | "STATUS_CHANGE";

export type FollowUpStatus =
    | "PENDING"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED";

export interface FollowUpUser {
    name: string;
}

export interface ResponseField {
    label: string;
}

export interface ResponseAnswer {
    value: string;
    field: ResponseField;
}

export interface FollowUpResponse {
    id: string;
    form:{
        title: string;
    }
    answers: ResponseAnswer[];
}

export interface FollowUp {
    id: string;
    type: FollowUpType;
    status: FollowUpStatus;
    note: string | null;
    nextFollowUpDate: string;
    createdAt: string;
    addedBy: FollowUpUser;
    response: FollowUpResponse;
}


export interface FollowUpListResponse {
    followUps: FollowUp[];
    page: number;
    limit: number;
    totalResponse: number;
    pageCount: number;
    hasMore: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Param {
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyType = 'none' | 'json' | 'form' | 'raw';

export interface RequestBody {
  type: BodyType;
  content: string;
}

export interface Auth {
  type: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  token?: string;
}

export interface HttpRequest {
  id?: string;
  collection_id?: string;
  name: string;
  method: string;
  url: string;
  headers: Header[];
  params: Param[];
  body: RequestBody;
  auth: Auth;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timeMs: number;
  size: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests?: HttpRequest[];
}

export interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  request_data: {
      headers: Record<string, string>;
      body: RequestBody;
  };
}

export interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string }[];
}

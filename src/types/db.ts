type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Cast = {
  hash: string
  signature: string
  signer: string
  text: string
  fid: number
  mentions?: Json | null
  parent_fid?: number | null
  parent_hash?: string | null
  thread_hash?: string | null
  deleted?: boolean | null
  published_at: Date
}

export type Profile = {
  id: number
  owner?: string | null
  username?: string | null
  display_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  registered_at?: string | null
}

export type Verification = {
  fid: number
  address: string
  signature: string
  created_at?: string | null
}
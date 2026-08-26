export type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

export interface FlatFolder {
  id: string
  title: string
  parentId?: string
  depth: number
}

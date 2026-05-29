import { create } from 'zustand';
import { supabase } from './supabase';
import type {
  Category, CategorySchema, Item, Transaction,
  UserProfile, OrgMember, SchemaField, ItemStatus, ConditionGrade, ItemImage, UserRole,
} from '../types/database';
import { Json } from './schemaTypes';

// ============================================================
// Xignis App — Central Store (Zustand) + Supabase Sync
// ============================================================

interface AppState {
  // ---- Data ----
  categories: Category[];
  schemas: CategorySchema[];
  items: Item[];
  transactions: Transaction[];
  users: UserProfile[];
  members: OrgMember[];
  
  // ---- Status ----
  isDataLoaded: boolean;
  activeOrgId: string | null;

  // ---- UI State ----
  selectedCategoryId: string | null;
  columnVisibility: Record<string, boolean>;   // per-column toggle
  savedColumnPresets: Record<string, string[]>; // categoryId -> visible column keys

  // ---- Data Sync Actions ----
  fetchInitialData: (orgId: string) => Promise<void>;

  // ---- Category Actions ----
  addCategory: (category: Omit<Category, 'id' | 'org_id' | 'item_count'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // ---- Schema Actions ----
  getSchemaForCategory: (categoryId: string) => CategorySchema | undefined;
  updateSchema: (categoryId: string, fields: SchemaField[]) => Promise<void>;

  // ---- Item Actions ----
  addItem: (item: Omit<Item, 'id' | 'org_id' | 'created_at'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getFilteredItems: (categoryId: string | null, status: ItemStatus | 'all', search: string) => Item[];
  uploadItemImages: (itemId: string, files: File[]) => Promise<{ error: string | null }>;
  deleteItemImage: (itemId: string, imageId: string) => Promise<{ error: string | null }>;
  setPrimaryImage: (itemId: string, imageId: string) => Promise<{ error: string | null }>;

  // ---- Transaction Actions ----
  createTransaction: (input: CreateTransactionInput) => Promise<{ loanCode: string | null; error: string | null }>;
  returnTransaction: (transactionId: string, conditionIn: ConditionGrade, nextStatus: ItemStatus, notes?: string) => Promise<{ error: string | null }>;
  deleteTransaction: (transactionId: string) => Promise<{ error: string | null }>;

  // ---- Member Actions ----
  createMember: (input: { email: string; password: string; full_name: string; role: UserRole }) => Promise<{ error: string | null; warning?: string; success?: string }>;
  updateMemberRole: (memberId: string, newRole: UserRole) => Promise<{ error: string | null }>;
  removeMember: (memberId: string) => Promise<{ error: string | null }>;

  // ---- Column Visibility ----
  setColumnVisibility: (columnKey: string, visible: boolean) => void;
  resetColumnVisibility: () => void;
  saveColumnPreset: (categoryId: string, visibleKeys: string[]) => void;

  // ---- UI Actions ----
  setSelectedCategory: (id: string | null) => void;
}

interface CreateTransactionInput {
  userId: string;
  items: { itemId: string; quantity?: number; conditionOut?: ConditionGrade }[];
  dueDate?: string | null;
  notes?: string | null;
}

const normalizeTransaction = (transaction: any): Transaction => ({
  ...transaction,
  user: transaction.profiles ?? transaction.user ?? undefined,
  items: (transaction.transaction_items ?? transaction.items ?? []).map((transactionItem: any) => ({
    ...transactionItem,
    item: transactionItem.items ?? transactionItem.item ?? undefined,
  })),
});

const createLoanCode = (existingCount: number) => {
  const year = new Date().getFullYear();
  const serial = String(existingCount + 1).padStart(4, '0');
  return `PRE-${year}-${serial}`;
};

const ITEM_IMAGES_BUCKET = 'xignis-item-images';

export const useAppStore = create<AppState>((set, get) => ({
  categories: [],
  schemas: [],
  items: [],
  transactions: [],
  users: [],
  members: [],
  
  isDataLoaded: false,
  activeOrgId: null,

  selectedCategoryId: null,
  columnVisibility: {},
  savedColumnPresets: {},

  // ==========================================
  // SYNC
  // ==========================================
  fetchInitialData: async (orgId: string) => {
    // Avoid re-fetching if already loaded for the same org
    if (get().isDataLoaded && get().activeOrgId === orgId) return;

    // Fetch categories & schemas
    const { data: catData } = await supabase.from('categories').select('*').eq('org_id', orgId);
    
    // Fetch schemas for those categories
    let schemaData: CategorySchema[] = [];
    if (catData && catData.length > 0) {
      const { data } = await supabase
        .from('category_schemas')
        .select('*')
        .in('category_id', catData.map(c => c.id));
      schemaData = (data as unknown as CategorySchema[]) || [];
    }

    // Fetch items
    const { data: itemData } = await supabase.from('items').select('*, item_images(*)').eq('org_id', orgId);

    // Calculate item_counts locally for categories based on items
    const catsWithCounts = (catData || []).map(c => ({
      ...c,
      item_count: (itemData || []).filter(i => i.category_id === c.id).length
    }));

    // Fetch org members & profiles
    const { data: memData } = await supabase.from('org_members').select('*, profiles(*)').eq('org_id', orgId);
    
    const members = (memData || []).map(m => ({
      ...m,
      user: m.profiles ?? m.user ?? undefined,
    }));
    const users = members.map(m => m.user) as unknown as UserProfile[];

    // Fetch transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, profiles:user_id(*), transaction_items(*, items(*))')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    set({
      categories: catsWithCounts as Category[],
      schemas: schemaData,
      items: ((itemData || []) as any[]).map(item => ({
        ...item,
        images: item.item_images ?? [],
      })) as Item[],
      members: members as OrgMember[],
      users: users,
      transactions: ((txData || []) as any[]).map(normalizeTransaction),
      activeOrgId: orgId,
      isDataLoaded: true
    });
  },

  // ==========================================
  // CATEGORIES
  // ==========================================
  addCategory: async (categoryData) => {
    const orgId = get().activeOrgId;
    if (!orgId) return;

    // Optimistic insert (without real ID until Supabase responds)
    const tempId = `temp-${Date.now()}`;
    const newCatOptimistic: Category = { ...categoryData, id: tempId, org_id: orgId, item_count: 0 };
    set(state => ({ categories: [...state.categories, newCatOptimistic] }));

    // Real DB Insert
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: categoryData.name,
        org_id: orgId,
        parent_id: categoryData.parent_id,
        icon: categoryData.icon,
        description: categoryData.description,
        sort_order: categoryData.sort_order,
        is_active: categoryData.is_active,
      }])
      .select()
      .single();

    if (!error && data) {
      // Replace temp ID with real ID
      set(state => ({
        categories: state.categories.map(c => c.id === tempId ? { ...c, id: data.id, item_count: 0 } : c)
      }));
    } else {
      // Rollback
      set(state => ({ categories: state.categories.filter(c => c.id !== tempId) }));
    }
  },

  updateCategory: async (id, updates) => {
    // Optimistic
    set(state => ({
      categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    // DB
    await supabase.from('categories').update(updates).eq('id', id);
  },

  deleteCategory: async (id) => {
    // Optimistic
    const prevCats = get().categories;
    const prevSchemas = get().schemas;
    set(state => ({
      categories: state.categories.filter(c => c.id !== id),
      schemas: state.schemas.filter(s => s.category_id !== id),
    }));
    // DB
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { // rollback
      set({ categories: prevCats, schemas: prevSchemas });
    }
  },

  // ==========================================
  // SCHEMAS
  // ==========================================
  getSchemaForCategory: (categoryId) => {
    return get().schemas.find(s => s.category_id === categoryId);
  },

  updateSchema: async (categoryId, fields) => {
    const existing = get().schemas.find(s => s.category_id === categoryId);
    const prevSchemas = get().schemas;

    // Optimistic
    if (existing) {
      set(state => ({
        schemas: state.schemas.map(s =>
          s.category_id === categoryId
            ? { ...s, fields, version: s.version + 1, updated_at: new Date().toISOString() }
            : s
        ),
      }));
      // DB
      const { error } = await supabase.from('category_schemas')
        .update({ fields: fields as unknown as Json, version: existing.version + 1, updated_at: new Date().toISOString() })
        .eq('category_id', categoryId);
      
      if (error) set({ schemas: prevSchemas }); // rollback
    } else {
      const newSchema: CategorySchema = {
        id: `temp-${Date.now()}`,
        category_id: categoryId,
        fields,
        version: 1,
        updated_at: new Date().toISOString(),
      };
      set(state => ({ schemas: [...state.schemas, newSchema] }));
      
      // DB
      const { data, error } = await supabase.from('category_schemas')
        .insert([{ category_id: categoryId, fields: fields as unknown as Json, version: 1 }])
        .select().single();
        
      if (error) {
        set({ schemas: prevSchemas }); // rollback
      } else if (data) {
        set(state => ({
          schemas: state.schemas.map(s => s.category_id === categoryId ? { ...s, id: data.id } : s)
        }));
      }
    }
  },

  // ==========================================
  // ITEMS
  // ==========================================
  addItem: async (itemData) => {
    const orgId = get().activeOrgId;
    if (!orgId) {
      console.error('[addItem] No activeOrgId — cannot persist item. Ensure fetchInitialData completed.');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newItemOptimistic: Item = {
      ...itemData,
      id: tempId,
      org_id: orgId,
      created_at: new Date().toISOString(),
    };

    // Optimistic
    set(state => {
      const categories = state.categories.map(c =>
        c.id === itemData.category_id ? { ...c, item_count: (c.item_count ?? 0) + 1 } : c
      );
      return { items: [...state.items, newItemOptimistic], categories };
    });

    // DB
    const { data, error } = await supabase.from('items')
      .insert([{
        org_id: orgId,
        category_id: itemData.category_id,
        name: itemData.name,
        sku: itemData.sku,
        serial_number: itemData.serial_number,
        status: itemData.status,
        attributes: itemData.attributes as unknown as Json,
        notes: itemData.notes,
        quantity: itemData.quantity,
        quantity_available: itemData.quantity_available,
        is_consumable: itemData.is_consumable
      }])
      .select().single();

    if (error) {
      // rollback
      set(state => {
        const categories = state.categories.map(c =>
          c.id === itemData.category_id ? { ...c, item_count: Math.max(0, (c.item_count ?? 1) - 1) } : c
        );
        return { items: state.items.filter(i => i.id !== tempId), categories };
      });
    } else if (data) {
      set(state => ({
        items: state.items.map(i => i.id === tempId ? { ...i, id: data.id } : i)
      }));
    }
  },

  updateItem: async (id, updates) => {
    // Optimistic
    set(state => ({ items: state.items.map(i => i.id === id ? { ...i, ...updates } : i) }));
    // DB
    const dbUpdates: any = { ...updates };
    if (updates.attributes) dbUpdates.attributes = updates.attributes as unknown as Json;
    await supabase.from('items').update(dbUpdates).eq('id', id);
  },

  deleteItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    const prevItems = get().items;
    const prevCats = get().categories;

    // Optimistic
    set(state => {
      const categories = item
        ? state.categories.map(c => c.id === item.category_id ? { ...c, item_count: Math.max(0, (c.item_count ?? 1) - 1) } : c)
        : state.categories;
      return { items: state.items.filter(i => i.id !== id), categories };
    });

    // Cascade-delete images from Storage and DB
    if (item?.images?.length) {
      const paths = item.images.map(img => img.path);
      await supabase.storage.from(ITEM_IMAGES_BUCKET).remove(paths);
      await supabase.from('item_images').delete().eq('item_id', id);
    }

    // DB delete item
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { // rollback
      set({ items: prevItems, categories: prevCats });
    }
  },

  getFilteredItems: (categoryId, status, search) => {
    const state = get();
    let items = state.items;

    if (categoryId) {
      const collectDescendants = (parentId: string): string[] => {
        const children = state.categories.filter(c => c.parent_id === parentId);
        return children.flatMap(child => [child.id, ...collectDescendants(child.id)]);
      };
      const allIds = [categoryId, ...collectDescendants(categoryId)];
      items = items.filter(i => allIds.includes(i.category_id));
    }
    if (status !== 'all') items = items.filter(i => i.status === status);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || (i.serial_number?.toLowerCase().includes(q) ?? false));
    }
    return items;
  },

  uploadItemImages: async (itemId, files) => {
    if (!files.length) return { error: null };

    const item = get().items.find(current => current.id === itemId);
    if (!item) return { error: 'No se encontro el articulo.' };

    const alreadyHasPrimary = !!item.images?.some(image => image.is_primary);
    const batchId = `up-${Date.now()}`;

    // Optimistic: show placeholders instantly with local blob URLs
    const tempImages: ItemImage[] = files.map((file, index) => ({
      id: `${batchId}-${index}`,
      item_id: itemId,
      url: URL.createObjectURL(file),
      path: '__pending__',
      is_primary: !alreadyHasPrimary && index === 0,
    }));

    set(state => ({
      items: state.items.map(i =>
        i.id === itemId
          ? { ...i, images: [...(i.images ?? []), ...tempImages] }
          : i
      ),
    }));

    const uploadedImages: ItemImage[] = [];

    for (const [index, file] of files.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
      const path = `${itemId}/${Date.now()}-${index}-${safeName || `image.${extension}`}`;

      const { error: uploadError } = await supabase.storage
        .from(ITEM_IMAGES_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        tempImages.forEach(img => URL.revokeObjectURL(img.url));
        set(state => ({
          items: state.items.map(i =>
            i.id === itemId
              ? { ...i, images: (i.images ?? []).filter(img => !img.id.startsWith(batchId)) }
              : i
          ),
        }));
        return { error: uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage.from(ITEM_IMAGES_BUCKET).getPublicUrl(path);
      const isPrimary = !alreadyHasPrimary && index === 0;

      const { data: imageData, error: insertError } = await supabase
        .from('item_images')
        .insert([{ item_id: itemId, url: publicUrlData.publicUrl, path, is_primary: isPrimary }])
        .select()
        .single();

      if (insertError) {
        tempImages.forEach(img => URL.revokeObjectURL(img.url));
        set(state => ({
          items: state.items.map(i =>
            i.id === itemId
              ? { ...i, images: (i.images ?? []).filter(img => !img.id.startsWith(batchId)) }
              : i
          ),
        }));
        return { error: insertError.message };
      }

      if (imageData) uploadedImages.push(imageData as ItemImage);
    }

    // Revoke blob URLs and replace temp images with real ones
    tempImages.forEach(img => URL.revokeObjectURL(img.url));

    set(state => ({
      items: state.items.map(current =>
        current.id === itemId
          ? {
              ...current,
              images: [
                ...(current.images ?? []).filter(img => !img.id.startsWith(batchId)),
                ...uploadedImages,
              ],
            }
          : current
      ),
    }));

    return { error: null };
  },

  deleteItemImage: async (itemId, imageId) => {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return { error: 'No se encontro el articulo.' };

    const image = item.images?.find(img => img.id === imageId);
    if (!image) return { error: 'No se encontro la imagen.' };

    const prevItems = get().items;

    // Optimistic
    set(state => ({
      items: state.items.map(i =>
        i.id === itemId
          ? { ...i, images: (i.images ?? []).filter(img => img.id !== imageId) }
          : i
      ),
    }));

    // Delete from DB
    const { error: dbError } = await supabase
      .from('item_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      set({ items: prevItems });
      return { error: dbError.message };
    }

    // Delete from Storage (non-critical)
    await supabase.storage.from(ITEM_IMAGES_BUCKET).remove([image.path]);

    return { error: null };
  },

  setPrimaryImage: async (itemId, imageId) => {
    const prevItems = get().items;

    // Optimistic
    set(state => ({
      items: state.items.map(i =>
        i.id === itemId
          ? {
              ...i,
              images: (i.images ?? []).map(img => ({
                ...img,
                is_primary: img.id === imageId,
              })),
            }
          : i
      ),
    }));

    // DB: unset all images for this item
    const { error: unsetError } = await supabase
      .from('item_images')
      .update({ is_primary: false })
      .eq('item_id', itemId);

    if (unsetError) {
      set({ items: prevItems });
      return { error: unsetError.message };
    }

    // DB: set the selected one as primary
    const { error: setError } = await supabase
      .from('item_images')
      .update({ is_primary: true })
      .eq('id', imageId);

    if (setError) {
      set({ items: prevItems });
      return { error: setError.message };
    }

    return { error: null };
  },

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  createTransaction: async ({ userId, items, dueDate, notes }) => {
    const orgId = get().activeOrgId;
    if (!orgId) return { loanCode: null, error: 'No hay organizacion activa.' };
    if (!items.length) return { loanCode: null, error: 'Selecciona al menos un articulo.' };

    const currentItems = get().items;
    const selectedItems = items
      .map(input => ({ input, item: currentItems.find(current => current.id === input.itemId) }))
      .filter(entry => entry.item);

    const unavailable = selectedItems.find(entry => entry.item?.status !== 'available');
    if (unavailable?.item) {
      return { loanCode: null, error: `${unavailable.item.name} no esta disponible.` };
    }

    const loanCode = createLoanCode(get().transactions.length);
    const previousItems = get().items;
    const previousTransactions = get().transactions;

    set(state => ({
      items: state.items.map(item =>
        items.some(input => input.itemId === item.id)
          ? { ...item, status: 'checked_out', quantity_available: item.is_consumable ? Math.max(0, item.quantity_available - (items.find(input => input.itemId === item.id)?.quantity ?? 1)) : 0 }
          : item
      ),
    }));

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        org_id: orgId,
        user_id: userId,
        loan_code: loanCode,
        status: 'active',
        due_date: dueDate || null,
        notes: notes || null,
      }])
      .select('*, profiles:user_id(*)')
      .single();

    if (transactionError || !transactionData) {
      set({ items: previousItems });
      return { loanCode: null, error: transactionError?.message ?? 'No se pudo crear el prestamo.' };
    }

    const transactionItemsPayload = items.map(item => ({
      transaction_id: transactionData.id,
      item_id: item.itemId,
      quantity: item.quantity ?? 1,
      condition_out: item.conditionOut ?? 'good',
    }));

    const { data: transactionItemsData, error: itemsError } = await supabase
      .from('transaction_items')
      .insert(transactionItemsPayload)
      .select('*, items(*)');

    if (itemsError) {
      await supabase.from('transactions').delete().eq('id', transactionData.id);
      set({ items: previousItems, transactions: previousTransactions });
      return { loanCode: null, error: itemsError.message };
    }

    const selectedIds = items.map(item => item.itemId);
    const { error: updateError } = await supabase
      .from('items')
      .update({ status: 'checked_out', quantity_available: 0 })
      .in('id', selectedIds);

    if (updateError) {
      set({ items: previousItems, transactions: previousTransactions });
      return { loanCode: null, error: updateError.message };
    }

    const createdTransaction = normalizeTransaction({
      ...transactionData,
      transaction_items: transactionItemsData || [],
    });

    set(state => ({ transactions: [createdTransaction, ...state.transactions] }));
    return { loanCode, error: null };
  },

  returnTransaction: async (transactionId, conditionIn, nextStatus, notes) => {
    const transaction = get().transactions.find(t => t.id === transactionId);
    if (!transaction) return { error: 'No se encontro el prestamo.' };
    if (transaction.status !== 'active' && transaction.status !== 'overdue') {
      return { error: 'Este prestamo ya no esta activo.' };
    }

    const returnedAt = new Date().toISOString();
    const itemIds = transaction.items?.map(item => item.item_id) ?? [];
    const previousItems = get().items;
    const previousTransactions = get().transactions;
    const nextNotes = notes
      ? [transaction.notes, `Devolucion: ${notes}`].filter(Boolean).join('\n')
      : transaction.notes;

    set(state => ({
      transactions: state.transactions.map(current =>
        current.id === transactionId
          ? {
              ...current,
              status: 'returned',
              returned_at: returnedAt,
              notes: nextNotes ?? null,
              items: current.items?.map(item => ({ ...item, condition_in: conditionIn })) ?? [],
            }
          : current
      ),
      items: state.items.map(item =>
        itemIds.includes(item.id)
          ? { ...item, status: nextStatus, quantity_available: item.is_consumable ? item.quantity : item.quantity_available }
          : item
      ),
    }));

    const { error: transactionError } = await supabase
      .from('transactions')
      .update({ status: 'returned', returned_at: returnedAt, notes: nextNotes ?? null })
      .eq('id', transactionId);

    if (transactionError) {
      set({ items: previousItems, transactions: previousTransactions });
      return { error: transactionError.message };
    }

    const { error: txItemsError } = await supabase
      .from('transaction_items')
      .update({ condition_in: conditionIn })
      .eq('transaction_id', transactionId);

    if (txItemsError) {
      set({ items: previousItems, transactions: previousTransactions });
      return { error: txItemsError.message };
    }

    if (itemIds.length > 0) {
      const updateResults = await Promise.all(
        itemIds.map(itemId => {
          const item = previousItems.find(current => current.id === itemId);
          return supabase
            .from('items')
            .update({
              status: nextStatus,
              quantity_available: nextStatus === 'available' ? (item?.is_consumable ? item.quantity : 1) : 0,
            })
            .eq('id', itemId);
        })
      );

      const itemError = updateResults.find(result => result.error)?.error;

      if (itemError) {
        set({ items: previousItems, transactions: previousTransactions });
        return { error: itemError.message };
      }
    }

    return { error: null };
  },

  deleteTransaction: async (transactionId) => {
    const transaction = get().transactions.find(t => t.id === transactionId);
    if (!transaction) return { error: 'No se encontró el préstamo.' };

    const previousTransactions = get().transactions;
    const previousItems = get().items;
    const itemIds = transaction.items?.map(item => item.item_id) ?? [];

    // Optimistic: remove from state
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== transactionId),
    }));

    // If transaction is active/overdue, return items to available
    if (transaction.status === 'active' || transaction.status === 'overdue') {
      if (itemIds.length > 0) {
        const updateResults = await Promise.all(
          itemIds.map(itemId => {
            const item = previousItems.find(i => i.id === itemId);
            return supabase
              .from('items')
              .update({
                status: 'available',
                quantity_available: item?.is_consumable ? item.quantity : 1,
              })
              .eq('id', itemId);
          })
        );

        const itemError = updateResults.find(result => result.error)?.error;
        if (itemError) {
          set({ transactions: previousTransactions, items: previousItems });
          return { error: `Error al devolver artículos: ${itemError.message}` };
        }

        // Update local items state
        set(state => ({
          items: state.items.map(item =>
            itemIds.includes(item.id)
              ? { ...item, status: 'available' as ItemStatus, quantity_available: item.is_consumable ? item.quantity : 1 }
              : item
          ),
        }));
      }
    }

    // Delete transaction_items first (foreign key)
    const { error: txItemsError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transactionId);

    if (txItemsError) {
      set({ transactions: previousTransactions, items: previousItems });
      return { error: txItemsError.message };
    }

    // Delete the transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (transactionError) {
      set({ transactions: previousTransactions, items: previousItems });
      return { error: transactionError.message };
    }

    return { error: null };
  },

  // ==========================================
  // MEMBERS
  // ==========================================
  createMember: async ({ email, password, full_name, role }) => {
    const orgId = get().activeOrgId;
    if (!orgId) return { error: 'No hay organización activa.' };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { error: 'El email es requerido.' };
    if (!full_name.trim()) return { error: 'El nombre es requerido.' };
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member
      const existingMember = get().members.find(m => m.user_id === existingProfile.id);
      if (existingMember) return { error: 'Este usuario ya es miembro de la organización.' };

      // User exists but not in this org - add directly
      const tempId = `temp-${Date.now()}`;
      const optimisticMember: OrgMember = {
        id: tempId,
        org_id: orgId,
        user_id: existingProfile.id,
        role,
        joined_at: new Date().toISOString(),
        user: { id: existingProfile.id, email: normalizedEmail, full_name: full_name.trim(), avatar_url: null, created_at: new Date().toISOString() } as UserProfile,
      };
      set(state => ({ members: [...state.members, optimisticMember] }));

      const { data, error } = await supabase
        .from('org_members')
        .insert([{ org_id: orgId, user_id: existingProfile.id, role }])
        .select('*, profiles(*)')
        .single();

      if (error) {
        set(state => ({ members: state.members.filter(m => m.id !== tempId) }));
        return { error: error.message };
      }

      set(state => ({
        members: state.members.map(m =>
          m.id === tempId
            ? { ...m, id: data.id, joined_at: data.joined_at ?? m.joined_at }
            : m
        ),
      }));

      return { error: null, success: 'Miembro agregado directamente.' };
    }

    // User doesn't exist - create via Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: 'No hay sesión activa.' };
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          full_name: full_name.trim(),
          role,
          org_id: orgId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Error al crear el usuario.' };
      }

      // Fetch the newly created member
      const { data: newMember } = await supabase
        .from('org_members')
        .select('*, profiles(*)')
        .eq('user_id', result.user_id)
        .eq('org_id', orgId)
        .maybeSingle();

      if (newMember) {
        const member: OrgMember = {
          ...newMember,
          user: newMember.profiles ?? newMember.user ?? undefined,
        };
        set(state => ({ members: [...state.members, member] }));
      }

      return { error: null, warning: result.warning, success: `Usuario creado: ${normalizedEmail}` };
    } catch (err) {
      console.error('Error calling create-user function:', err);
      return { error: 'Error de conexión al crear el usuario.' };
    }
  },

  updateMemberRole: async (memberId, newRole) => {
    const prevMembers = get().members;

    // Optimistic
    set(state => ({
      members: state.members.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ),
    }));

    // DB
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      set({ members: prevMembers });
      return { error: error.message };
    }

    return { error: null };
  },

  removeMember: async (memberId) => {
    const prevMembers = get().members;

    // Optimistic
    set(state => ({
      members: state.members.filter(m => m.id !== memberId),
    }));

    // DB
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      set({ members: prevMembers });
      return { error: error.message };
    }

    return { error: null };
  },

  // ==========================================
  // UI LOGIC
  // ==========================================
  setColumnVisibility: (columnKey, visible) => set((state) => ({ columnVisibility: { ...state.columnVisibility, [columnKey]: visible } })),
  resetColumnVisibility: () => set({ columnVisibility: {} }),
  saveColumnPreset: (categoryId, visibleKeys) => set((state) => ({ savedColumnPresets: { ...state.savedColumnPresets, [categoryId]: visibleKeys } })),
  setSelectedCategory: (id) => set({ selectedCategoryId: id }),
}));

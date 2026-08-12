// types/pet-types.ts
import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

// ===== CORE TYPES =====
export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

// ===== USER TYPES =====
export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    avatar?: string;
    profile_image?: string;
    role: 'admin' | 'staff' | 'buyer' | 'seller' | 'provider';
    status: 'active' | 'inactive' | 'suspended';
    verification_status?: 'pending' | 'verified' | 'rejected';
    business_name?: string;
    business_address?: string;
    business_license?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface UserFormData {
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'staff';
    status: 'active' | 'inactive' | 'suspended';
    password?: string;
    password_confirmation?: string;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    suspended_users: number;
    admin_users: number;
    staff_users: number;
}

// ===== CATEGORY TYPES =====
export interface Category {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
    product_items_count?: number;
}

export interface CategoryFormData {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
}

// Updated types/pet-types.ts - Added image support for products

// ===== PRODUCT TYPES WITH IMAGE SUPPORT =====
export interface ProductItem {
    id: number;
    sku: string;
    name: string;
    description?: string;
    category_id: number;
    user_id: number;
    price: number;
    cost?: number;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    unit: string;
    status: 'active' | 'inactive' | 'discontinued';
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    images?: string[]; // Array of image paths
    created_at: string;
    updated_at: string;
    category?: Category;
    seller?: User;
    user?: User;
}

export interface ProductFormData {
    sku: string;
    name: string;
    description?: string;
    category_id: number;
    price: number;
    cost?: number;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    unit: string;
    status: 'active' | 'inactive' | 'discontinued';
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    images?: File[]; // For file uploads
    remove_images?: number[]; // Indexes of images to remove during updates
}

// ===== IMAGE HANDLING TYPES =====
export interface ProductImageData {
    id?: number;
    product_id: number;
    image_path: string;
    image_url?: string;
    is_primary?: boolean;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ImageUploadProgress {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    url?: string;
    error?: string;
}

// ===== IMAGE COMPONENT PROPS =====
export interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    onImageDelete?: (index: number) => void;
    canEdit?: boolean;
}

export interface ImageUploadProps {
    onImagesSelected: (files: File[]) => void;
    maxImages?: number;
    maxSizePerImage?: number; // in MB
    acceptedFormats?: string[];
    existingImagesCount?: number;
}

export interface ImagePreviewProps {
    images: (File | string)[];
    onRemove: (index: number) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    maxImages?: number;
}

// ===== UTILITY FUNCTIONS =====
export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
    validFiles: File[];
    invalidFiles: { file: File; error: string }[];
}

export interface ImageResizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

// Helper function types
export type ImageValidator = (files: File[]) => ImageValidationResult;
export type ImageResizer = (file: File, options: ImageResizeOptions) => Promise<File>;
export type ImageUploader = (files: File[]) => Promise<string[]>;

// ===== UPDATED MODAL PROPS =====
export interface ProductModalProps extends ModalProps {
    product?: ProductItem | null;
    onSave: (data: ProductFormData) => void;
    categories: Category[];
    maxImages?: number;
}

// Rest of the existing types remain the same...
export interface Category {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
    product_items_count?: number;
}


export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: any;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export interface ProductResponse extends ApiResponse<ProductItem[]> {
    pagination: PaginationData;
}

export interface ProductFilters {
    search?: string;
    category_id?: number;
    seller_id?: number;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

export interface ProductStats {
    total_products: number;
    active_products: number;
    inactive_products: number;
    discontinued_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    in_stock_products: number;
    total_categories: number;
    total_inventory_value: number;
    average_product_price: number;
    expiring_soon_products: number;
    expired_products: number;
    total_sellers: number;
}

// ===== STOCK MOVEMENT TYPES =====
export interface StockMovement {
    id: number;
    product_item_id: number;
    user_id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason: string;
    notes?: string;
    reference_number?: string;
    created_at: string;
    updated_at: string;
    product_item?: {
        id: number;
        sku: string;
        name: string;
    };
    user?: {
        id: number;
        name: string;
    };
}

export interface StockAdjustmentData {
    quantity: number;
    type: 'in' | 'out' | 'adjustment';
    reason: string;
    notes?: string;
    reference_number?: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: any;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export interface ProductResponse extends ApiResponse<ProductItem[]> {
    pagination: PaginationData;
}

export interface CategoryResponse extends ApiResponse<Category[]> {
    pagination: PaginationData;
}

export interface UserResponse extends ApiResponse<User[]> {
    pagination: PaginationData;
}

export interface StockHistoryResponse extends ApiResponse<{
    product: ProductItem;
    movements: StockMovement[];
    pagination: PaginationData;
}> {}

// ===== FILTER & SEARCH TYPES =====
export interface ProductFilters {
    search?: string;
    category_id?: number;
    seller_id?: number;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

export interface UserFilters {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    per_page?: number;
}

export interface CategoryFilters {
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

// ===== UI HELPER TYPES =====
export interface StatusBadgeProps {
    status: string;
    type?: 'product' | 'user' | 'category' | 'stock';
}

export interface StockStatusInfo {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
}

export interface NotificationProps {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose: () => void;
}

// ===== DASHBOARD TYPES =====
export interface DashboardStats {
    total_users?: number;
    total_products?: number;
    active_products?: number;
    low_stock_products?: number;
    out_of_stock_products?: number;
    total_inventory_value?: number;
    recent_orders?: any[];
    recent_products?: ProductItem[];
}

export interface ReportData {
    title: string;
    description: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down';
    icon: LucideIcon;
    color: string;
}

export interface TimeframeOption {
    value: string;
    label: string;
}

// ===== UTILITY TYPES =====
export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type UserRole = 'admin' | 'staff' | 'buyer' | 'seller' | 'provider';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type CategoryStatus = 'active' | 'inactive';
export type StockMovementType = 'in' | 'out' | 'adjustment';

// ===== FORM VALIDATION TYPES =====
export interface ValidationErrors {
    [key: string]: string[];
}

export interface FormState<T> {
    data: T;
    errors: ValidationErrors;
    processing: boolean;
}

// ===== MODAL TYPES =====
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface ProductModalProps extends ModalProps {
    product?: ProductItem | null;
    onSave: (data: ProductFormData) => void;
    categories: Category[];
}

export interface StockAdjustmentModalProps extends ModalProps {
    product: ProductItem;
    onSave: (data: StockAdjustmentData) => void;
}

export interface DeleteConfirmModalProps extends ModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
}

// ===== TABLE TYPES =====
export interface TableColumn<T> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    pagination?: PaginationData;
    loading?: boolean;
    onPageChange?: (page: number) => void;
    onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
}

// ===== BUSINESS LOGIC TYPES =====
export interface StockStatus {
    isInStock: boolean;
    isLowStock: boolean;
    isOutOfStock: boolean;
    statusText: string;
    statusColor: string;
}

export interface PriceInfo {
    selling_price: number;
    cost_price?: number;
    profit_margin?: number;
    markup_percentage?: number;
}

export interface InventoryValue {
    total_value: number;
    cost_value: number;
    potential_profit: number;
}

// Add these interfaces to pet-types.ts

// ===== ORDER TYPES =====
export interface Order {
    id: number;
    order_number: string;
    buyer_id: number;
    seller_id: number;
    total_amount: number;
    delivery_address: string;
    delivery_phone: string;
    delivery_notes?: string;
    payment_method: 'cod' | 'gcash' | 'bank_transfer';
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    status_notes?: string;
    delivered_at?: string;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
    buyer?: User;
    seller?: User;
    order_items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_item_id: number;
    quantity: number;
    price: number;
    total: number;
    created_at: string;
    updated_at: string;
    product_item?: ProductItem;
}

export interface OrderFormData {
    items: {
        product_id: number;
        quantity: number;
    }[];
    delivery_address: string;
    delivery_phone: string;
    delivery_notes?: string;
    payment_method: 'cod' | 'gcash' | 'bank_transfer';
}

export interface OrderStats {
    total_orders: number;
    pending_orders: number;
    confirmed_orders: number;
    processing_orders: number;
    shipped_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    pending_revenue: number;
    average_order_value: number;
    orders_today: number;
    revenue_today: number;
}

export interface OrderFilters {
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

export interface OrderResponse extends ApiResponse<Order[]> {
    pagination: PaginationData;
}

// ===== SHOP TYPES =====
export interface ShopFilters {
    search?: string;
    category_id?: string;
    seller_id?: string;
    min_price?: string;
    max_price?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

export interface ShopStats {
    total_products: number;
    total_categories: number;
    total_sellers: number;
    featured_products: ProductItem[];
}

// ===== ORDER TYPES =====
export interface Order {
    id: number;
    order_number: string;
    buyer_id: number;
    seller_id: number;
    total_amount: number;
    delivery_address: string;
    delivery_phone: string;
    delivery_notes?: string;
    payment_method: 'cod' | 'gcash' | 'bank_transfer';
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    status_notes?: string;
    delivered_at?: string;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
    buyer?: User;
    seller?: User;
    order_items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_item_id: number;
    quantity: number;
    price: number;
    total: number;
    created_at: string;
    updated_at: string;
    product_item?: ProductItem;
}

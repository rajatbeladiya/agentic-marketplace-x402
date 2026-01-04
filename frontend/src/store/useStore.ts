import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Store, Product, StoreRegistrationForm } from "@/types";

interface AppState {
  // Current store being set up
  currentStore: Store | null;
  setCurrentStore: (store: Store | null) => void;

  // Registration form data
  registrationForm: StoreRegistrationForm;
  setRegistrationForm: (form: Partial<StoreRegistrationForm>) => void;
  resetRegistrationForm: () => void;

  // Fetched products from Shopify
  shopifyProducts: Product[];
  setShopifyProducts: (products: Product[]) => void;

  // Selected products for marketplace
  selectedProductIds: Set<string>;
  toggleProductSelection: (productId: string) => void;
  selectAllProducts: (productIds: string[]) => void;
  clearSelection: () => void;

  // Workflow step
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const initialRegistrationForm: StoreRegistrationForm = {
  storeName: "",
  storeUrl: "",
  description: "",
  adminAccessToken: "",
  payToAddress: "",
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentStore: null,
      setCurrentStore: (store) => set({ currentStore: store }),

      registrationForm: initialRegistrationForm,
      setRegistrationForm: (form) =>
        set((state) => ({
          registrationForm: { ...state.registrationForm, ...form },
        })),
      resetRegistrationForm: () =>
        set({ registrationForm: initialRegistrationForm }),

      shopifyProducts: [],
      setShopifyProducts: (products) => set({ shopifyProducts: products }),

      selectedProductIds: new Set(),
      toggleProductSelection: (productId) =>
        set((state) => {
          const newSet = new Set(state.selectedProductIds);
          if (newSet.has(productId)) {
            newSet.delete(productId);
          } else {
            newSet.add(productId);
          }
          return { selectedProductIds: newSet };
        }),
      selectAllProducts: (productIds) =>
        set({ selectedProductIds: new Set(productIds) }),
      clearSelection: () => set({ selectedProductIds: new Set() }),

      currentStep: 0,
      setCurrentStep: (step) => set({ currentStep: step }),

      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "x402-shopify-store",
      partialize: (state) => ({
        currentStore: state.currentStore,
        registrationForm: state.registrationForm,
        currentStep: state.currentStep,
      }),
    }
  )
);

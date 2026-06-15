import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTzs } from "@/lib/currency";
import { formatQuantity } from "@/lib/quantity";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddProductDialog } from "@/components/AddProductDialog";
import type { Drug } from "@/lib/api/client";

export type ProductOption = {
  id: string;
  name: string;
  price?: number;
  quantity?: number;
};

interface ProductPickerProps {
  products: ProductOption[];
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  mode?: "sale" | "order";
  canAddProduct?: boolean;
  onProductAdded?: (product: Drug) => void;
  disabled?: boolean;
}

function productDetail(product: ProductOption, mode: "sale" | "order"): string | null {
  if (mode === "sale" && product.price != null && product.quantity != null) {
    return `${formatTzs(product.price)} · ${formatQuantity(product.quantity)} in stock`;
  }
  if (product.quantity != null) {
    return `${formatQuantity(product.quantity)} in stock`;
  }
  return null;
}

export function ProductPicker({
  products,
  value,
  onValueChange,
  placeholder = "Search product name…",
  emptyText = "No product found.",
  mode = "order",
  canAddProduct = false,
  onProductAdded,
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const selected = products.find((p) => p.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selected ? selected.name : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Type product name…" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {products.map((product) => {
                  const detail = productDetail(product, mode);
                  const outOfStock = mode === "sale" && product.quantity === 0;
                  return (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      disabled={outOfStock}
                      onSelect={() => {
                        if (outOfStock) return;
                        onValueChange(product.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === product.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate">{product.name}</div>
                        {detail && (
                          <div className="truncate text-xs text-muted-foreground">
                            {detail}
                            {outOfStock ? " · out of stock" : ""}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {canAddProduct && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setAddOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add new product
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {canAddProduct && (
        <AddProductDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={(product) => {
            onProductAdded?.(product);
            onValueChange(product.id);
          }}
        />
      )}
    </>
  );
}

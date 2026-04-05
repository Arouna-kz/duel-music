import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface AdminTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: string[];
  pageSize?: number;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

export function AdminTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys = [],
  pageSize = 10,
  emptyMessage = "Aucune donnée",
}: AdminTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), "fr", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
    if (sortDir === "asc") return <ChevronUp className="w-3 h-3 ml-1 text-primary" />;
    return <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {searchKeys.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
          <span>Lignes par page :</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable ? "cursor-pointer select-none hover:bg-muted/50 transition-colors" : ""}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow key={row.id ?? i} className="hover:bg-muted/20 transition-colors">
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sorted.length === 0 ? "0" : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, sorted.length)}`} sur {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p as number)}
                  className="h-8 w-8 p-0"
                >
                  {p}
                </Button>
              )
            )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

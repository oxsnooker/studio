
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMenuItems } from "../menu/actions";
import type { MenuItem } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { StockTable } from "./stock-table";

export default async function StockPage() {
  let menuItems: MenuItem[] = [];
  let error: string | null = null;

  try {
    menuItems = await getMenuItems();
  } catch (e: any) {
    error = "An error occurred while fetching stock data. Please ensure your Firestore database is set up correctly.";
    console.error(e);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Management</CardTitle>
        <CardDescription>View and update item inventory levels.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
           <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <StockTable initialItems={menuItems} />
        )}
      </CardContent>
    </Card>
  );
}

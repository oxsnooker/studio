import clientPromise from "@/lib/mongodb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

async function testConnection() {
  try {
    const client = await clientPromise;
    // The isConnected method is deprecated and will be removed in a future version.
    // Using admin().ping() is the recommended way to test a connection.
    await client.db("admin").command({ ping: 1 });
    return { connected: true };
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
        return { connected: false, error: e.message };
    }
    return { connected: false, error: "An unknown error occurred." };
  }
}

export default async function DbTestPage() {
  const { connected, error } = await testConnection();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
        <CardDescription>
          This page tests the connection to your MongoDB database based on the
          `MONGODB_URI` environment variable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="flex items-center gap-4 text-green-600">
            <CheckCircle className="h-10 w-10" />
            <div>
              <p className="font-bold text-lg">Connection Successful!</p>
              <p>
                Your app is successfully connected to the MongoDB database.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 text-destructive">
            <XCircle className="h-10 w-10 mt-1" />
            <div>
              <p className="font-bold text-lg">Connection Failed</p>
              <p className="mb-2">
                The application could not connect to the database.
              </p>
              <p className="text-sm font-mono bg-muted p-2 rounded-md text-destructive-foreground">
                <strong>Error:</strong> {error}
              </p>
               <p className="mt-4 text-sm text-muted-foreground">
                Please double-check your `MONGODB_URI` in the `.env` file and ensure your IP address is whitelisted in MongoDB Atlas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

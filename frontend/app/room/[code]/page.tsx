import { redirect } from 'next/navigation';

// Room codes are no longer used — redirect to homepage
// AirForShare now auto-discovers shared content on your WiFi
export default function RoomPage() {
  redirect('/');
}
import { recentActivities } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RecentActivityTable() {
  return (
    <ScrollArea className="h-[350px]">
      <div className="space-y-6">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://i.pravatar.cc/40?u=${activity.user}`} />
              <AvatarFallback>{activity.avatar}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1 text-sm">
              <p className="font-medium">
                <span className="font-semibold">{activity.user}</span> {activity.action}{' '}
                <span className="font-semibold">{activity.target}</span>
              </p>
              <p className="text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

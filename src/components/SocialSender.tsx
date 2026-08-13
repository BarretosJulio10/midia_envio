import SocialAccounts from "@/components/social/SocialAccounts";
import SocialQueue from "@/components/social/SocialQueue";

export default function SocialSender() {
  return (
    <div className="space-y-6">
      <SocialAccounts />
      <SocialQueue />
    </div>
  );
}

import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CouponManageUI from "./CouponManageUI";

export const metadata = {
  title: "Manage Coupon",
};

async function getCouponsData() {
  const client = await clientPromise;
  const db = client.db();
  const coupons = await db
    .collection("coupons")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return JSON.parse(JSON.stringify(coupons));
}

export default async function ManageCouponPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    redirect("/dashboard");
  }

  const coupons = await getCouponsData();

  return <CouponManageUI initialCoupons={coupons} />;
}

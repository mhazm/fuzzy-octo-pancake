"use client";

import React, { useState } from "react";
import {
  User,
  Check,
  X,
  Edit3,
  Save,
  Truck,
  ClipboardList,
  Loader2,
} from "lucide-react";

export default function RegisterManagerUI({ initialData, guildId }: any) {
  const [data, setData] = useState(initialData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const startEdit = (reg: any) => {
    setEditingId(reg._id);
    setEditForm({ ...reg });
  };

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "update",
  ) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/manage/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, guildId, editData: editForm }),
      });

      if (res.ok) {
        if (action === "update") {
          // Update data di local state saja, jangan hapus dari list
          setData(
            data.map((item: any) =>
              item._id === id ? { ...item, ...editForm } : item,
            ),
          );
          setEditingId(null);
        } else {
          // Jika approve/reject, baru hapus dari list pending
          setData(data.filter((item: any) => item._id !== id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="p-20 text-center glass-panel rounded-[3rem] border-dashed border-2 border-border opacity-30">
          <ClipboardList size={48} className="mx-auto mb-4" />
          <p className="font-black uppercase italic tracking-widest">
            No pending applications
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.map((reg: any) => (
            <div
              key={reg._id}
              className="glass-panel p-6 rounded-[2.5rem] border border-border bg-card/20 hover:border-primary/30 transition-all flex flex-col md:flex-row items-center gap-8"
            >
              {/* USER INFO */}
              <div className="flex items-center gap-5 min-w-[220px]">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-black text-(-primary-foreground) uppercase italic leading-none mb-1">
                    {reg.username}
                  </h3>
                  <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest italic">
                    {reg.status}
                  </p>
                </div>
              </div>

              {/* EDITABLE FIELDS */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-accent-sky uppercase tracking-widest">
                    Trucky ID
                  </label>
                  {editingId === reg._id ? (
                    <input
                      className="w-full bg-white/5 border border-primary/40 p-2 rounded-xl text-sm font-bold outline-none focus:border-primary"
                      value={editForm.truckyId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, truckyId: e.target.value })
                      }
                    />
                  ) : (
                    <div className="text-sm font-bold text-(-primary-foreground) flex items-center gap-2">
                      <Truck size={14} className="opacity-20" /> {reg.truckyId}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Reason / Experience
                  </label>
                  {editingId === reg._id ? (
                    <textarea
                      className="w-full bg-white/5 border border-primary/40 p-2 rounded-xl text-xs font-medium outline-none focus:border-primary"
                      value={editForm.reason}
                      rows={2}
                      onChange={(e) =>
                        setEditForm({ ...editForm, reason: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-xs text-foreground/40 italic line-clamp-1">
                      {reg.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3">
                {editingId === reg._id ? (
                  <button
                    onClick={() => handleAction(reg._id, "update")}
                    className="p-4 bg-emerald-500 text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                    title="Save Changes Only"
                  >
                    {loading === reg._id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save size={20} />
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(reg)}
                      className="p-4 bg-white/5 border border-border rounded-2xl text-foreground/40 hover:text-white transition-all"
                      title="Edit Data"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button
                      onClick={() => handleAction(reg._id, "approve")}
                      className="p-4 bg-primary text-white rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                      title="Approve & Register to Silvia"
                    >
                      {loading === reg._id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Check size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(reg._id, "reject")}
                      className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                      title="Reject"
                    >
                      <X size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

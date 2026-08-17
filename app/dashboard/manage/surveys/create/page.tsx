"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Trash2,
  Save,
  GripVertical,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Zap,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSurveyAction } from "@/app/actions/surveyActions";
import { compressImageToWebP } from "@/lib/imageUtils";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showAlert } from "@/lib/dialog";

// ─── Schemas ────────────────────────────────────────────────────────────────

const conditionSchema = z.object({
  dependentQuestionId: z.string().min(1, "Harus pilih pertanyaan"),
  operator: z.enum(["equals", "not_equals", "contains"]),
  value: z.string().min(1, "Nilai tidak boleh kosong"),
});

const questionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  type: z.enum(["text", "radio", "checkbox"]),
  options: z.array(
    z.object({ value: z.string().min(1, "Opsi tidak boleh kosong") })
  ),
  required: z.boolean(),
  conditionLogic: z.enum(["AND", "OR"]).optional(),
  conditions: z.array(conditionSchema).optional(),
});

const surveySchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  uri: z
    .string()
    .min(3, "URI minimal 3 karakter")
    .regex(
      /^[a-z0-9-]+$/,
      "Hanya boleh huruf kecil, angka, dan strip (-) tanpa spasi"
    ),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  targetSegment: z.enum(["all", "nismara_plus", "intern"]),
  rewardType: z.enum(["NONE", "NC", "PENALTY_TICKET"]),
  rewardAmount: z.number().min(0, "Reward tidak boleh minus"),
  expiresInDays: z
    .number({ message: "Harus berupa angka" })
    .min(1, "Minimal 1 hari"),
  questions: z.array(questionSchema).min(1, "Minimal harus ada 1 pertanyaan"),
});

type SurveyFormValues = z.infer<typeof surveySchema>;

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CreateSurveyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      uri: "",
      description: "",
      targetSegment: "all",
      rewardType: "NONE",
      rewardAmount: 0,
      expiresInDays: 7,
      questions: [
        {
          id: crypto.randomUUID(),
          questionText: "",
          type: "text",
          required: true,
          options: [],
          conditionLogic: "AND",
          conditions: [],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "questions",
    control: form.control,
  });

  async function onSubmit(data: SurveyFormValues) {
    setIsSubmitting(true);
    try {
      let finalImageUrl = undefined;

      if (bannerFile) {
        const compressedFile = await compressImageToWebP(bannerFile, 3, 1920);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressedFile.name,
            fileType: compressedFile.type,
            fileSize: compressedFile.size,
            folder: "surveys",
          }),
        });

        const uploadData = await res.json();
        if (!res.ok)
          throw new Error(uploadData.error || "Gagal mendapatkan URL upload");

        const uploadRes = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!uploadRes.ok) throw new Error("Gagal mengupload gambar ke server");
        finalImageUrl = uploadData.publicUrl;
      }

      const response = await createSurveyAction({
        ...data,
        imageUrl: finalImageUrl,
      });
      if (response.success) {
        await showAlert("✅ Berhasil! Survey diterbitkan.");
        form.reset();
        router.push("/dashboard/manage/surveys");
      } else {
        await showAlert(`❌ Gagal: ${response.error}`);
      }
    } catch (error: any) {
      console.error(error);
      await showAlert(
        `❌ Terjadi kesalahan: ${error.message || "Gagal menyimpan survey."}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleTitleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldChange: (e: any) => void
  ) => {
    fieldChange(e);
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    form.setValue("uri", slug, { shouldValidate: true });
  };

  const rewardType = form.watch("rewardType");

  const SEGMENT_LABELS: Record<string, string> = {
    all: "Semua Driver",
    nismara_plus: "Khusus Nismara+ Aktif",
    intern: "Khusus Driver Intern",
  };
  const REWARD_LABELS: Record<string, string> = {
    NONE: "Tidak Ada Hadiah",
    NC: "Nismara Coin (NC)",
    PENALTY_TICKET: "Tiket Hapus Penalti",
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manage/surveys">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border bg-background hover:bg-muted shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buat Survey Baru</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Isi semua informasi di bawah lalu publikasikan ke driver.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ══════════════════════════════════════════
              SECTION 1 – BANNER
          ══════════════════════════════════════════ */}
          <SectionCard
            icon={<ImageIcon className="w-4 h-4" />}
            title="Banner Survey"
            subtitle="Opsional — Gambar akan ditampilkan di halaman survey"
          >
            {bannerPreview ? (
              <div className="relative w-full h-48 md:h-60 rounded-xl overflow-hidden border border-border group">
                <Image
                  src={bannerPreview}
                  alt="Banner Preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Ganti
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 3 * 1024 * 1024) {
                          showAlert("File terlalu besar. Maksimal 3MB.");
                          return;
                        }
                        setBannerFile(file);
                        setBannerPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerPreview(null);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Hapus
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/60 transition-colors">
                <Upload className="w-7 h-7 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Klik untuk upload</span>{" "}
                  atau drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, JPEG (Maks. 3MB)
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 3 * 1024 * 1024) {
                      showAlert("File terlalu besar. Maksimal 3MB.");
                      return;
                    }
                    setBannerFile(file);
                    setBannerPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            )}
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 2 – INFORMASI UTAMA
          ══════════════════════════════════════════ */}
          <SectionCard
            icon={<ChevronDown className="w-4 h-4" />}
            title="Informasi Utama"
            subtitle="Judul, URL, dan deskripsi survey"
          >
            <div className="space-y-5">
              {/* Judul + URI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul Survey</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border"
                          placeholder="Cth: Survey Rute Convoy HUT"
                          {...field}
                          onChange={(e) => handleTitleChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border font-mono text-sm"
                          placeholder="survey-rute-convoy-hut"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs break-all">
                        /surveys/
                        <span className="font-semibold text-primary">
                          {field.value || "..."}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Deskripsi */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi / Tujuan</FormLabel>
                    <FormControl>
                      <Textarea
                        className="bg-background border-border resize-none h-24"
                        placeholder="Jelaskan tujuan survey ini..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Segment + Durasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetSegment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Peserta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue>
                              {SEGMENT_LABELS[field.value] || "Pilih Segmen"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">👥 Semua Driver</SelectItem>
                          <SelectItem value="nismara_plus">⭐ Khusus Nismara+ Aktif</SelectItem>
                          <SelectItem value="intern">🔰 Khusus Driver Intern</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Aktif (Hari)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="bg-background border-border"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Ditutup otomatis dalam{" "}
                        <span className="font-semibold text-foreground">
                          {field.value || 0} hari
                        </span>{" "}
                        ke depan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 3 – HADIAH
          ══════════════════════════════════════════ */}
          <SectionCard
            icon={<Zap className="w-4 h-4" />}
            title="Hadiah Survey"
            subtitle="Tentukan reward yang diterima driver setelah mengisi"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rewardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Hadiah</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue>
                            {REWARD_LABELS[field.value] || "Pilih Tipe Hadiah"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">🚫 Tidak Ada Hadiah</SelectItem>
                        <SelectItem value="NC">🪙 Nismara Coin (NC)</SelectItem>
                        <SelectItem value="PENALTY_TICKET">🎟️ Tiket Hapus Penalti</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rewardAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Jumlah{" "}
                      {rewardType === "NC"
                        ? "NC"
                        : rewardType === "PENALTY_TICKET"
                        ? "Poin Penalti"
                        : "Hadiah"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="bg-background border-border"
                        disabled={rewardType === "NONE"}
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {rewardType === "NONE"
                        ? "Isi 0 atau pilih tipe hadiah terlebih dahulu"
                        : rewardType === "NC"
                        ? "Jumlah NC yang diterima driver"
                        : "Jumlah poin penalti yang dihapus"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 4 – PERTANYAAN
          ══════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  Daftar Pertanyaan
                </h3>
                <p className="text-xs text-muted-foreground">
                  {fields.length} pertanyaan ditambahkan
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border bg-background text-foreground hover:bg-muted"
                onClick={() =>
                  append({
                    id: crypto.randomUUID(),
                    questionText: "",
                    type: "text",
                    required: true,
                    options: [],
                    conditionLogic: "AND",
                    conditions: [],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pertanyaan
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <QuestionCard
                  key={field.id}
                  control={form.control}
                  index={index}
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                  watchForm={form.watch}
                />
              ))}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-11"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan & Publikasikan
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function QuestionCard({
  control,
  index,
  onRemove,
  canRemove,
  watchForm,
}: {
  control: any;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  watchForm: any;
}) {
  const qType = watchForm(`questions.${index}.type`);
  const allQuestions = watchForm("questions");

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Drag handle + number */}
          <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              #{index + 1}
            </span>
          </div>

          <div className="flex-1 space-y-4">
            {/* Pertanyaan + Tipe */}
            <div className="flex flex-col md:flex-row gap-3">
              <FormField
                control={control}
                name={`questions.${index}.questionText`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        className="bg-background border-border"
                        placeholder={`Pertanyaan ${index + 1}...`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`questions.${index}.type`}
                render={({ field }) => (
                  <FormItem className="w-full md:w-44 shrink-0">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Tipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">📝 Teks Bebas</SelectItem>
                        <SelectItem value="radio">🔘 Pilihan Ganda</SelectItem>
                        <SelectItem value="checkbox">☑️ Kotak Centang</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Opsi Jawaban (hanya untuk radio/checkbox) */}
            {(qType === "radio" || qType === "checkbox") && (
              <OptionsManager control={control} questionIndex={index} />
            )}

            {/* Footer: Wajib Diisi + Hapus */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <FormField
                control={control}
                name={`questions.${index}.required`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                      Wajib Diisi
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={onRemove}
                disabled={!canRemove}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Logika Kondisional */}
            <LogicManager
              control={control}
              questionIndex={index}
              allQuestions={allQuestions}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OptionsManager({
  control,
  questionIndex,
}: {
  control: any;
  questionIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/50">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Opsi Jawaban
      </p>
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
          <FormField
            control={control}
            name={`questions.${questionIndex}.options.${optionIndex}.value`}
            render={({ field }) => (
              <FormItem className="flex-1 space-y-0">
                <FormControl>
                  <Input
                    className="h-8 bg-background border-border text-sm"
                    placeholder={`Opsi ${optionIndex + 1}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => remove(optionIndex)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10 mt-1 pl-0"
        onClick={() => append({ value: "" })}
      >
        <Plus className="w-3 h-3 mr-1" />
        Tambah Opsi
      </Button>
    </div>
  );
}

function LogicManager({
  control,
  questionIndex,
  allQuestions,
}: {
  control: any;
  questionIndex: number;
  allQuestions: any[];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.conditions`,
  });

  // Only previous questions can be depended on
  const availableQuestions = allQuestions.slice(0, questionIndex);

  if (questionIndex === 0) return null;

  return (
    <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-dashed border-border mt-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Logika Kondisional
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tampilkan pertanyaan ini hanya jika...
          </p>
        </div>

        {fields.length > 1 && (
          <FormField
            control={control}
            name={`questions.${questionIndex}.conditionLogic`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <Select onValueChange={field.onChange} value={field.value || "AND"}>
                  <FormControl>
                    <SelectTrigger className="h-7 bg-background border-border text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="AND">Semua (AND)</SelectItem>
                    <SelectItem value="OR">Salah Satu (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
      </div>

      {fields.map((field, conditionIndex) => {
        // Get the selected question's options for smart value dropdown
        const selectedQuestionId = (field as any).dependentQuestionId;
        const selectedQuestion = availableQuestions.find(
          (q) => q.id === selectedQuestionId
        );
        const selectedQuestionOptions: string[] =
          selectedQuestion?.options?.map((o: any) => o.value).filter(Boolean) || [];

        return (
          <div
            key={field.id}
            className="flex flex-col md:flex-row items-start md:items-center gap-2 bg-background p-3 rounded-lg border border-border"
          >
            {/* 1. Pilih Pertanyaan */}
            <FormField
              control={control}
              name={`questions.${questionIndex}.conditions.${conditionIndex}.dependentQuestionId`}
              render={({ field }) => {
                const selectedQ = availableQuestions.find(q => q.id === field.value);
                const selectedQIndex = availableQuestions.findIndex(q => q.id === field.value);
                const displayLabel = selectedQ
                  ? `${selectedQIndex + 1}. ${selectedQ.questionText || "(belum diisi)"}`
                  : "Pilih pertanyaan...";
                return (
                  <FormItem className="flex-1 min-w-0 space-y-0 w-full md:w-auto">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 bg-background border-border text-xs">
                          <SelectValue>{displayLabel}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableQuestions.map((q, idx) => (
                          <SelectItem key={q.id || idx} value={q.id || `temp-${idx}`}>
                            {idx + 1}. {q.questionText || "(belum diisi)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* 2. Operator */}
            <FormField
              control={control}
              name={`questions.${questionIndex}.conditions.${conditionIndex}.operator`}
              render={({ field }) => {
                const OPERATOR_LABELS: Record<string, string> = {
                  equals: "sama dengan",
                  not_equals: "tidak sama",
                  contains: "mengandung",
                };
                return (
                  <FormItem className="w-full md:w-32 shrink-0 space-y-0">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 bg-background border-border text-xs">
                          <SelectValue>
                            {OPERATOR_LABELS[field.value] || "Operator"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="equals">sama dengan</SelectItem>
                        <SelectItem value="not_equals">tidak sama</SelectItem>
                        <SelectItem value="contains">mengandung</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* 3. Nilai — dropdown dari opsi jika ada, text input jika tidak */}
            <FormField
              control={control}
              name={`questions.${questionIndex}.conditions.${conditionIndex}.value`}
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0 space-y-0 w-full md:w-auto">
                  <FormControl>
                    {selectedQuestionOptions.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-8 bg-background border-border text-xs">
                          <SelectValue>
                            {field.value || "Pilih jawaban..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {selectedQuestionOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 bg-background border-border text-xs"
                        placeholder="Nilai jawaban..."
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => remove(conditionIndex)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}

      {availableQuestions.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 pl-0"
          onClick={() =>
            append({
              dependentQuestionId: "",
              operator: "equals",
              value: "",
            })
          }
        >
          <Plus className="w-3 h-3 mr-1" />
          Tambah Kondisi
        </Button>
      )}
    </div>
  );
}

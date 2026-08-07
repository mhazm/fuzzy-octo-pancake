"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Save, GripVertical, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateSurveyAction } from "@/app/actions/surveyActions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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


const questionSchema = z.object({
  questionText: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  type: z.enum(["text", "radio", "checkbox"]),
  options: z.array(
    z.object({ value: z.string().min(1, "Opsi tidak boleh kosong") }),
  ),
  required: z.boolean(),
});

const surveySchema = z.object({
  id: z.string(),
  title: z.string().min(3, "Judul minimal 3 karakter"),
  uri: z
    .string()
    .min(3, "URI minimal 3 karakter")
    .regex(
      /^[a-z0-9-]+$/,
      "Hanya boleh huruf kecil, angka, dan strip (-) tanpa spasi",
    ),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  rewardNC: z.number().min(0, "Reward tidak boleh minus"),
  active: z.boolean(),
  questions: z.array(questionSchema).min(1, "Minimal harus ada 1 pertanyaan"),
});

type SurveyFormValues = z.infer<typeof surveySchema>;

export default function EditSurveyForm({
  initialData,
}: {
  initialData: SurveyFormValues;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: initialData,
  });

  const { fields, append, remove } = useFieldArray({
    name: "questions",
    control: form.control,
  });

  async function onSubmit(data: SurveyFormValues) {
    setIsSubmitting(true);
    try {
      const response = await updateSurveyAction(data);
      if (response.success) {
        await showAlert("✅ Berhasil! Perubahan survey telah disimpan di MongoDB.");
        router.push("/dashboard/manage/surveys");
      } else {
        await showAlert(`❌ Gagal: ${response.error}`);
      }
    } catch (error) {
      await showAlert("❌ Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Tombol Kembali */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/manage/surveys">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border bg-background hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Survey</h1>
            <p className="text-sm text-muted-foreground">
              Ubah atau sesuaikan kuesioner driver.
            </p>
          </div>
        </div>

        {/* TOGGLE ACTIVE STATUS */}
        <Form {...form}>
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
                <FormLabel className="text-sm text-foreground font-medium cursor-pointer">
                  Status:
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <span
                  className={`text-xs font-bold uppercase ${field.value ? "text-accent-sky" : "text-muted-foreground"}`}
                >
                  {field.value ? "Buka" : "Tutup"}
                </span>
              </FormItem>
            )}
          />
        </Form>
      </div>

      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* SECTION: INFO UTAMA */}
              <div className="space-y-6 p-5 rounded-lg border border-border bg-background">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-lg text-foreground">
                    Informasi Utama
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">
                          Judul Survey
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground"
                            placeholder="Judul..."
                            {...field}
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
                        <FormLabel className="text-foreground">
                          URL Slug (URI)
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground"
                            placeholder="slug..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">
                        Deskripsi / Tujuan
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="bg-background border-border text-foreground resize-none h-24"
                          placeholder="Deskripsi..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rewardNC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">
                        Reward (Nismara Coin)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-background border-border text-foreground w-full md:w-1/3"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SECTION: PERTANYAAN */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-semibold text-lg text-foreground">
                    Daftar Pertanyaan
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border bg-background text-foreground hover:bg-muted"
                    onClick={() =>
                      append({
                        questionText: "",
                        type: "text",
                        required: true,
                        options: [],
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" /> Tambah Pertanyaan
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card
                    key={field.id}
                    className="relative border-border bg-background shadow-sm"
                  >
                    <CardContent className="p-5 gap-4 flex flex-col md:flex-row items-start">
                      <div className="mt-2 text-muted-foreground hidden md:block">
                        <GripVertical className="w-5 h-5 cursor-grab" />
                      </div>

                      <div className="flex-1 space-y-4 w-full">
                        <div className="flex flex-col md:flex-row gap-4">
                          <FormField
                            control={form.control}
                            name={`questions.${index}.questionText`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-foreground">
                                  Pertanyaan {index + 1}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="bg-card border-border text-foreground"
                                    placeholder="Pertanyaan..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`questions.${index}.type`}
                            render={({ field }) => (
                              <FormItem className="w-full md:w-48">
                                <FormLabel className="text-foreground">
                                  Tipe Jawaban
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-card border-border text-foreground">
                                      <SelectValue placeholder="Pilih Tipe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="text">
                                      Teks Bebas
                                    </SelectItem>
                                    <SelectItem value="radio">
                                      Pilihan Ganda
                                    </SelectItem>
                                    <SelectItem value="checkbox">
                                      Kotak Centang
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {(form.watch(`questions.${index}.type`) === "radio" ||
                          form.watch(`questions.${index}.type`) ===
                            "checkbox") && (
                          <OptionsManager
                            control={form.control}
                            questionIndex={index}
                          />
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <FormField
                            control={form.control}
                            name={`questions.${index}.required`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal text-foreground">
                                  Wajib Diisi
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
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
    <div className="space-y-3 bg-card p-4 rounded-md border border-dashed border-border">
      <FormLabel className="text-sm text-foreground">Opsi Jawaban</FormLabel>
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`questions.${questionIndex}.options.${optionIndex}.value`}
            render={({ field }) => (
              <FormItem className="flex-1 space-y-0">
                <FormControl>
                  <Input
                    className="h-9 bg-background border-border text-foreground"
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
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => remove(optionIndex)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs mt-2 border-border bg-background text-foreground hover:bg-muted"
        onClick={() => append({ value: "" })}
      >
        <Plus className="w-3 h-3 mr-1" /> Tambah Opsi
      </Button>
    </div>
  );
}

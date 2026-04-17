import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { invoke } from "@/lib/electron";
import { ShieldCheck, XCircle, Info } from "lucide-react";
import data from "../../../package.json";
import Button from "./ui/button";

export default function FirstTime() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const firstTime = localStorage.getItem("firstTime");
    // Show if firstTime key is missing or explicitly "true"
    if (!firstTime || firstTime === "true") {
      const timer = setTimeout(() => setOpen(true), 500); // Slight delay for smooth entrance
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGetStarted = async () => {
    localStorage.setItem("firstTime", "false");
    setOpen(false);

    const toastId = toast.loading(
      "Đang tạo điểm khôi phục hệ thống... Vui lòng đợi.",
      { closeOnClick: false, draggable: false }
    );

    try {
      await invoke({ channel: "create-vie-restore-point" });

      toast.update(toastId, {
        render: "Đã tạo điểm khôi phục thành công!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render: "Không thể tạo điểm khôi phục. Vui lòng thử lại sau.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      console.error("Error creating restore point:", err);
    }
  };

  const handleSkipRestorePoint = () => {
    localStorage.setItem("firstTime", "false");
    setOpen(false);
    toast.info("Đã bỏ qua tạo điểm khôi phục.", { autoClose: 2000 });
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0a0a0c]/95 shadow-[0_0_50px_rgba(34,211,238,0.15)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500"
          >
            {/* Glowing Top Bar */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

            {/* Stepper Dots */}
            <div className="absolute top-6 left-0 right-0 flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-cyan-400" : step > i ? "w-2 bg-cyan-400/50" : "w-2 bg-white/10"}`} />
              ))}
            </div>

            <div className="p-8 pt-14">
              <div className="flex flex-col items-center text-center">

                {step === 1 && (
                  <div className="animate-in slide-in-from-right-4 fade-in duration-500 w-full flex flex-col items-center">
                    <div className="mb-6 rounded-2xl bg-cyan-500/10 p-5 ring-1 ring-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      <ShieldCheck className="h-12 w-12 text-cyan-400" />
                    </div>
                    <h2 className="mb-2 text-3xl font-display text-white tracking-wide">
                      Chào sân <span className="text-cyan-400">VieXF 1.0</span>
                    </h2>
                    <p className="mb-8 text-white/50 text-sm leading-relaxed max-w-sm font-medium">
                      Giao diện Minimalist mới, tối đa hiệu năng, xoá bỏ mọi bóng bẩy thừa thãi. Trải nghiệm hệ thống mượt mà như lụa.
                    </p>
                    <Button
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 py-6 rounded-xl font-bold uppercase tracking-wider transition-all"
                      onClick={() => setStep(2)}
                    >
                      Khám Phá Luôn
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="animate-in slide-in-from-right-4 fade-in duration-500 w-full flex flex-col">
                    <h2 className="mb-6 text-2xl font-display text-white tracking-wide">
                      Bản Đồ Hack
                    </h2>
                    <div className="space-y-3 mb-8 text-left">
                      <div className="p-4 rounded-xl border border-white/5 bg-[#09090b]/80 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Info size={20} /></div>
                        <div><p className="text-sm font-bold text-white uppercase tracking-wider">Dashboard</p><p className="text-xs text-white/40">Theo dõi thông số RAM/CPU thời gian thực</p></div>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-[#09090b]/80 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Info size={20} /></div>
                        <div><p className="text-sm font-bold text-white uppercase tracking-wider">Tweaks</p><p className="text-xs text-white/40">1-click hack tốc độ, bypass giới hạn</p></div>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-[#09090b]/80 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400"><XCircle size={20} /></div>
                        <div><p className="text-sm font-bold text-white uppercase tracking-wider">Lưu Ý Quan Trọng</p><p className="text-xs text-white/40">Đọc kỹ HDSD trước khi trảm app</p></div>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 py-6 rounded-xl font-bold uppercase tracking-wider transition-all"
                      onClick={() => setStep(3)}
                    >
                      Tiếp Tục Đi
                    </Button>
                  </div>
                )}

                {step === 3 && (
                  <div className="animate-in slide-in-from-right-4 fade-in duration-500 w-full flex flex-col items-center">
                    <h2 className="mb-2 text-2xl font-display text-white tracking-wide">
                      Cái Phao Cuối Cùng
                    </h2>
                    <p className="mb-6 text-white/50 text-sm leading-relaxed max-w-sm font-medium">
                      Trước khi quậy tung cái máy tính này lên, làm ơn tạo điểm khôi phục (Restore Point) để còn có đường lùi nhé.
                    </p>

                    <div className="mb-8 w-full rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 text-left shadow-inner">
                      <div className="flex items-start gap-4">
                        <Info className="h-6 w-6 shrink-0 text-cyan-400 mt-0.5" />
                        <div className="space-y-1.5">
                          <p className="text-sm text-white/90">
                            Hệ thống sẽ snapshot lại toàn bộ cài đặt Windows hiện tại. Khuyên dùng 100%.
                          </p>
                          <p className="text-xs text-cyan-400/60 font-bold uppercase tracking-wider">
                            Chỉ tải từ GitHub chính chủ.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row">
                      <Button
                        variant="ghost"
                        className="w-full text-white/40 hover:text-white hover:bg-white/5 border border-white/10 px-0 py-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                        onClick={handleSkipRestorePoint}
                      >
                        Tự Tin Bỏ Qua
                      </Button>
                      <Button
                        className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.2)] px-0 py-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                        onClick={handleGetStarted}
                      >
                        Tạo Phao Ngay
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-center gap-3 text-[10px] text-white/20 uppercase tracking-widest font-mono font-bold">
                  <span>v{data?.version || "1.0.3"}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span>GenZ Edit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

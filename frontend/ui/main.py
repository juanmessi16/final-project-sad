"""
main.py - Entry point utama untuk SiLab Exam System
Menyediakan pilihan untuk menjalankan antarmuka Python:
1. Desktop GUI (Tkinter) -> python main.py --desktop (atau python ui.py)
2. Web UI (Browser)      -> python main.py --web     (atau python web_ui.py)
"""

import sys
import os

def main():
    print("=====================================================================")
    print("      SiLab Exam System - Fakultas Ilmu Komputer Universitas Klabat ")
    print("=====================================================================")
    print("Pilih moda antarmuka (UI) yang ingin dijalankan:")
    print("  [1] Antarmuka Desktop Python (Tkinter GUI)")
    print("  [2] Antarmuka Web Browser Python (HTTP Server)")
    print("  [0] Keluar")
    print("=====================================================================")

    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["--desktop", "-d", "1"]:
            import ui
            app = ui.SiLabApp()
            app.mainloop()
            return
        elif arg in ["--web", "-w", "2"]:
            import web_ui
            web_ui.run_web_server()
            return

    choice = input("Pilihan Anda (1/2/0) [Default: 1]: ").strip()
    if choice == "2":
        import web_ui
        web_ui.run_web_server()
    elif choice == "0":
        print("Keluar dari program.")
        sys.exit(0)
    else:
        import ui
        app = ui.SiLabApp()
        app.mainloop()

if __name__ == "__main__":
    main()

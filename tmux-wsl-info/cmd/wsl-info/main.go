package main

import (
	"flag"
	"fmt"
	"os"
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32 = syscall.NewLazyDLL("kernel32.dll")

	procGetSystemPowerStatus   = kernel32.NewProc("GetSystemPowerStatus")
	procGlobalMemoryStatusEx   = kernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes         = kernel32.NewProc("GetSystemTimes")
)

// --- Win32 Structures ---

type systemPowerStatus struct {
	ACLineStatus        byte
	BatteryFlag         byte
	BatteryLifePercent  byte
	SystemStatusFlag    byte
	BatteryLifeTime     uint32
	BatteryFullLifeTime uint32
}

type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

// --- Win32 API Wrappers ---

func getSystemTimes() (idle, kernel, user uint64) {
	var idleTime, kernelTime, userTime syscall.Filetime
	ret, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleTime)),
		uintptr(unsafe.Pointer(&kernelTime)),
		uintptr(unsafe.Pointer(&userTime)),
	)
	if ret == 0 {
		return 0, 0, 0
	}
	idle = uint64(idleTime.HighDateTime)<<32 | uint64(idleTime.LowDateTime)
	kernel = uint64(kernelTime.HighDateTime)<<32 | uint64(kernelTime.LowDateTime)
	user = uint64(userTime.HighDateTime)<<32 | uint64(userTime.LowDateTime)
	return
}

// Removed getCPUSpeed to optimize and simplify CPU info display

func getMemory() (percent uint32) {
	var mem memoryStatusEx
	mem.Length = uint32(unsafe.Sizeof(mem))
	ret, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&mem)))
	if ret == 0 {
		return 0
	}
	return mem.MemoryLoad
}

func getBattery() (acLine byte, percent byte, charging bool) {
	var status systemPowerStatus
	ret, _, _ := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&status)))
	if ret == 0 {
		return 0, 255, false
	}
	charging = (status.BatteryFlag & 0x08) != 0
	return status.ACLineStatus, status.BatteryLifePercent, charging
}

// --- Formatting ---

func formatCPU(percent float64) string {
	return fmt.Sprintf("🖥️ %3.0f%%", percent)
}

func formatRAM(percent uint32) string {
	return fmt.Sprintf("🧠 %3d%%", percent)
}

func formatBattery(acLine byte, percent byte, charging bool) string {
	if percent == 255 { // unknown / no battery
		return ""
	}

	icon := "🔋"
	if percent < 25 {
		icon = "🪫"
	}

	if charging {
		return fmt.Sprintf("%s⚡ %3d%%", icon, percent)
	} else if acLine == 1 { // AC connected, not charging
		if percent == 100 {
			return "🔌"
		}
		return fmt.Sprintf("🔌 %3d%%", percent)
	}
	return fmt.Sprintf("%s %3d%%", icon, percent)
}

// --- Main ---

func printStats(cpuPercent float64) {
	ramPercent := getMemory()
	acLine, batPercent, charging := getBattery()

	cpuStr := formatCPU(cpuPercent)
	ramStr := formatRAM(ramPercent)
	batStr := formatBattery(acLine, batPercent, charging)

	if batStr == "" {
		fmt.Printf("%s %s\n", cpuStr, ramStr)
	} else {
		fmt.Printf("%s %s %s\n", cpuStr, ramStr, batStr)
	}
}

func main() {
	interval := flag.Int("interval", 0, "Update interval in seconds. If > 0, runs as a daemon.")
	flag.Parse()

	if *interval <= 0 {
		// Single-shot run (backwards compatible)
		idle1, kernel1, user1 := getSystemTimes()
		time.Sleep(200 * time.Millisecond)
		idle2, kernel2, user2 := getSystemTimes()

		idleDelta := idle2 - idle1
		totalDelta := (kernel2 - kernel1) + (user2 - user1)
		var cpuPercent float64
		if totalDelta > 0 {
			cpuPercent = (1.0 - float64(idleDelta)/float64(totalDelta)) * 100
			if cpuPercent < 0 {
				cpuPercent = 0
			}
		}
		printStats(cpuPercent)
		return
	}

	// Persistent Daemon Mode
	// Exit immediately if the parent process terminates (closing stdin)
	go func() {
		buf := make([]byte, 1)
		_, err := os.Stdin.Read(buf)
		if err != nil {
			os.Exit(0)
		}
	}()

	// Get initial sample and print initial stats (with quick 200ms delta on startup)
	idlePrev, kernelPrev, userPrev := getSystemTimes()
	time.Sleep(200 * time.Millisecond)
	idleCurr, kernelCurr, userCurr := getSystemTimes()
	
	idleDelta := idleCurr - idlePrev
	totalDelta := (kernelCurr - kernelPrev) + (userCurr - userPrev)
	var cpuPercent float64
	if totalDelta > 0 {
		cpuPercent = (1.0 - float64(idleDelta)/float64(totalDelta)) * 100
		if cpuPercent < 0 {
			cpuPercent = 0
		}
	}
	printStats(cpuPercent)

	// Update previous values to current
	idlePrev, kernelPrev, userPrev = idleCurr, kernelCurr, userCurr

	// Continuous loop
	ticker := time.NewTicker(time.Duration(*interval) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		idleCurr, kernelCurr, userCurr := getSystemTimes()

		idleDelta := idleCurr - idlePrev
		totalDelta := (kernelCurr - kernelPrev) + (userCurr - userPrev)
		var cpuPercent float64
		if totalDelta > 0 {
			cpuPercent = (1.0 - float64(idleDelta)/float64(totalDelta)) * 100
			if cpuPercent < 0 {
				cpuPercent = 0
			}
		}

		printStats(cpuPercent)

		idlePrev, kernelPrev, userPrev = idleCurr, kernelCurr, userCurr
	}
}

package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"
	"golang.org/x/sys/windows/svc/eventlog"
	"golang.org/x/sys/windows/svc/mgr"
)

type responseBody struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

type device struct {
	ID             string `json:"id"`
	Model          string `json:"model"`
	AndroidVersion string `json:"androidVersion"`
	IPAddress      string `json:"ipAddress"`
	Status         string `json:"status"`
	ProxyEnabled   bool   `json:"proxyEnabled"`
	CertInstalled  bool   `json:"certInstalled"`
}

type requestPayload struct {
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	ProxyHost string `json:"proxyHost"`
	ProxyPort int    `json:"proxyPort"`
	CertURL   string `json:"certUrl"`
	CertHash  string `json:"certHash"`
}

var port = envOrDefault("ADB_AGENT_PORT", "3131")
var serviceName = "AIVoiceAdbAgent"
var serviceDisplayName = "AI Voice ADB Agent"

type agentService struct{}

func main() {
	if len(os.Args) > 1 {
		if handleServiceCommand(os.Args[1]) {
			return
		}
	}

	isService, err := svc.IsWindowsService()
	if err == nil && isService {
		_ = svc.Run(serviceName, agentService{})
		return
	}

	if err := elevateInstallAndStart(); err != nil {
		fmt.Println("自动安装失败:", err)
		fmt.Println("你也可以右键管理员运行: adb-agent-windows.exe install-start")
		fmt.Println("临时前台运行请执行: adb-agent-windows.exe run")
		fmt.Println("按回车退出...")
		_, _ = fmt.Scanln()
	}
}

func runAgent(serviceMode bool) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", route)

	addr := "127.0.0.1:" + port
	if !serviceMode {
		fmt.Println("ADB Agent started")
		fmt.Println("Local address: http://" + addr)
		fmt.Println("Keep this window open, then choose 本机 ADB in the web page.")
	}

	if err := http.ListenAndServe(addr, mux); err != nil {
		if !serviceMode {
			fmt.Println("启动失败:", err)
		}
		os.Exit(1)
	}
}

func (m agentService) Execute(_ []string, changes <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.StartPending}
	server := &http.Server{Addr: "127.0.0.1:" + port, Handler: http.HandlerFunc(route)}

	go func() {
		_ = server.ListenAndServe()
	}()

	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}
	for change := range changes {
		switch change.Cmd {
		case svc.Interrogate:
			status <- change.CurrentStatus
		case svc.Stop, svc.Shutdown:
			status <- svc.Status{State: svc.StopPending}
			_ = server.Close()
			return false, 0
		}
	}
	return false, 0
}

func handleServiceCommand(command string) bool {
	switch strings.ToLower(command) {
	case "run":
		runAgent(false)
	case "install-start":
		if err := installOrUpdateService(); err != nil {
			printResult(err)
			return true
		}
		printResult(startServiceIfNeeded())
	case "install":
		printResult(installService())
	case "uninstall", "remove":
		printResult(uninstallService())
	case "start":
		printResult(startService())
	case "stop":
		printResult(stopService())
	case "restart":
		_ = stopService()
		time.Sleep(time.Second)
		printResult(startService())
	case "status":
		printResult(showServiceStatus())
	case "debug":
		_ = debug.Run(serviceName, agentService{})
	default:
		return false
	}
	return true
}

func elevateInstallAndStart() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	psCommand := fmt.Sprintf("Start-Process -FilePath '%s' -ArgumentList 'install-start' -Verb RunAs", strings.ReplaceAll(exePath, "'", "''"))
	cmd := exec.Command("powershell", "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", psCommand)
	hideCommandWindow(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	fmt.Println("正在请求管理员权限安装 ADB Agent 服务...")
	return nil
}

func installOrUpdateService() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err == nil {
		service.Close()
		if err := stopServiceIfRunning(); err != nil {
			return err
		}
		if err := uninstallService(); err != nil {
			return err
		}
		if err := waitForServiceDeleted(10 * time.Second); err != nil {
			return err
		}
	}
	return installService()
}

func installService() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err == nil {
		service.Close()
		return fmt.Errorf("服务已安装")
	}

	service, err = manager.CreateService(serviceName, exePath, mgr.Config{
		DisplayName: serviceDisplayName,
		StartType:   mgr.StartAutomatic,
		Description: "Provides local ADB access for the TV AI Voice test system.",
	})
	if err != nil {
		return fmt.Errorf("安装服务失败，请用管理员权限运行: %w", err)
	}
	defer service.Close()
	_ = eventlog.InstallAsEventCreate(serviceName, eventlog.Error|eventlog.Warning|eventlog.Info)
	return nil
}

func uninstallService() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("服务未安装")
	}
	defer service.Close()
	if err := service.Delete(); err != nil {
		return fmt.Errorf("卸载服务失败，请用管理员权限运行: %w", err)
	}
	_ = eventlog.Remove(serviceName)
	return nil
}

func startService() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("服务未安装")
	}
	defer service.Close()
	if err := service.Start(); err != nil {
		return fmt.Errorf("启动服务失败: %w", err)
	}
	return nil
}

func startServiceIfNeeded() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("服务未安装")
	}
	defer service.Close()
	status, err := service.Query()
	if err != nil {
		return err
	}
	if status.State == svc.Running {
		return nil
	}
	if err := service.Start(); err != nil {
		return fmt.Errorf("启动服务失败: %w", err)
	}
	return nil
}

func stopService() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("服务未安装")
	}
	defer service.Close()
	status, err := service.Control(svc.Stop)
	if err != nil {
		return fmt.Errorf("停止服务失败: %w", err)
	}
	for status.State != svc.Stopped {
		time.Sleep(300 * time.Millisecond)
		status, err = service.Query()
		if err != nil {
			return err
		}
	}
	return nil
}

func stopServiceIfRunning() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return nil
	}
	defer service.Close()

	status, err := service.Query()
	if err != nil {
		return err
	}
	if status.State == svc.Stopped {
		return nil
	}
	if status.State != svc.StopPending {
		if status, err = service.Control(svc.Stop); err != nil {
			return fmt.Errorf("停止服务失败: %w", err)
		}
	}
	deadline := time.Now().Add(10 * time.Second)
	for status.State != svc.Stopped {
		if time.Now().After(deadline) {
			return fmt.Errorf("等待服务停止超时")
		}
		time.Sleep(300 * time.Millisecond)
		status, err = service.Query()
		if err != nil {
			return err
		}
	}
	return nil
}

func waitForServiceDeleted(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		manager, err := mgr.Connect()
		if err != nil {
			return fmt.Errorf("连接服务管理器失败，请用管理员权限运行: %w", err)
		}
		service, openErr := manager.OpenService(serviceName)
		if openErr != nil {
			manager.Disconnect()
			return nil
		}
		service.Close()
		manager.Disconnect()
		if time.Now().After(deadline) {
			return fmt.Errorf("等待旧服务删除超时")
		}
		time.Sleep(300 * time.Millisecond)
	}
}

func showServiceStatus() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("连接服务管理器失败: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("服务未安装")
	}
	defer service.Close()
	status, err := service.Query()
	if err != nil {
		return err
	}
	fmt.Println("服务状态:", status.State)
	return nil
}

func printResult(err error) {
	if err != nil {
		fmt.Println("失败:", err)
		os.Exit(1)
	}
	fmt.Println("成功")
}

func route(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == http.MethodOptions {
		writeJSON(w, http.StatusNoContent, responseBody{Success: true})
		return
	}

	path := r.URL.Path
	if r.Method == http.MethodGet && path == "/health" {
		writeJSON(w, http.StatusOK, responseBody{Success: true, Data: map[string]interface{}{"mode": "adb-agent-go", "port": port}})
		return
	}

	if r.Method == http.MethodGet && path == "/api/mitm/devices" {
		writeJSON(w, http.StatusOK, responseBody{Success: true, Data: listDevices(r.URL.Query().Get("certHash"))})
		return
	}

	if r.Method == http.MethodPost && path == "/api/mitm/devices/connect" {
		var body requestPayload
		if err := decodeJSON(r, &body); err != nil {
			writeJSON(w, http.StatusBadRequest, responseBody{Success: false, Message: "JSON 格式错误"})
			return
		}
		if strings.TrimSpace(body.IP) == "" {
			writeJSON(w, http.StatusBadRequest, responseBody{Success: false, Message: "缺少 IP 地址"})
			return
		}
		if body.Port == 0 {
			body.Port = 5555
		}
		writeJSON(w, http.StatusOK, connectDevice(body.IP, body.Port))
		return
	}

	re := regexp.MustCompile(`^/api/mitm/devices/(.+)/(disconnect|proxy/enable|proxy/disable|cert/install)$`)
	matches := re.FindStringSubmatch(path)
	if r.Method == http.MethodPost && len(matches) == 3 {
		deviceID := matches[1]
		action := matches[2]
		var body requestPayload
		_ = decodeJSON(r, &body)

		switch action {
		case "disconnect":
			writeJSON(w, http.StatusOK, disconnectDevice(deviceID))
		case "proxy/enable":
			if body.ProxyPort == 0 {
				body.ProxyPort = 8888
			}
			writeJSON(w, http.StatusOK, enableProxy(deviceID, body.ProxyHost, body.ProxyPort))
		case "proxy/disable":
			writeJSON(w, http.StatusOK, disableProxy(deviceID))
		case "cert/install":
			writeJSON(w, http.StatusOK, installCert(deviceID, body.CertURL, body.CertHash))
		}
		return
	}

	writeJSON(w, http.StatusNotFound, responseBody{Success: false, Message: "端点不存在"})
}

func listDevices(certHash string) []device {
	output := adbExec("", "devices", "-l")
	lines := strings.Split(output, "\n")
	devices := make([]device, 0)
	ipRe := regexp.MustCompile(`inet\s+(\d+\.\d+\.\d+\.\d+)`)

	for _, line := range lines[1:] {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		id := parts[0]
		status := "offline"
		if parts[1] == "device" {
			status = "online"
		} else if parts[1] == "unauthorized" {
			status = "unauthorized"
		}

		item := device{ID: id, Status: status}
		if status == "online" {
			item.Model = adbExec(id, "shell", "getprop", "ro.product.model")
			item.AndroidVersion = adbExec(id, "shell", "getprop", "ro.build.version.release")
			item.ProxyEnabled = checkProxyEnabled(id)
			if certHash != "" {
				item.CertInstalled = checkCertInstalled(id, certHash)
			}
			if strings.Contains(id, ":") {
				item.IPAddress = strings.Split(id, ":")[0]
			} else {
				ipOutput := adbExec(id, "shell", "ip", "-4", "addr", "show", "wlan0")
				if match := ipRe.FindStringSubmatch(ipOutput); len(match) == 2 {
					item.IPAddress = match[1]
				}
			}
		}
		devices = append(devices, item)
	}

	return devices
}

func connectDevice(ip string, targetPort int) responseBody {
	output := adbExec("", "connect", fmt.Sprintf("%s:%d", ip, targetPort))
	success := strings.Contains(output, "connected") || strings.Contains(output, "already")
	return responseBody{Success: success, Message: output}
}

func disconnectDevice(deviceID string) responseBody {
	output := adbExec("", "disconnect", deviceID)
	return responseBody{Success: true, Message: output}
}

func enableProxy(deviceID string, proxyHost string, proxyPort int) responseBody {
	if strings.TrimSpace(proxyHost) == "" {
		return responseBody{Success: false, Message: "缺少 proxyHost"}
	}
	reverseResult := adbExec(deviceID, "reverse", fmt.Sprintf("tcp:%d", proxyPort), fmt.Sprintf("tcp:%d", proxyPort))
	target := fmt.Sprintf("127.0.0.1:%d", proxyPort)
	reverseLower := strings.ToLower(reverseResult)
	if strings.Contains(reverseLower, "error") || strings.Contains(reverseLower, "failed") {
		target = fmt.Sprintf("%s:%d", proxyHost, proxyPort)
	}
	result := adbExec(deviceID, "shell", "settings", "put", "global", "http_proxy", target)
	if checkProxyEnabled(deviceID) {
		proxy := adbExec(deviceID, "shell", "settings", "get", "global", "http_proxy")
		return responseBody{Success: true, Message: "代理已设置: " + proxy}
	}
	return responseBody{Success: false, Message: "设置失败: " + result}
}

func disableProxy(deviceID string) responseBody {
	adbExec(deviceID, "shell", "settings", "put", "global", "http_proxy", ":0")
	adbExec(deviceID, "reverse", "--remove", "tcp:8888")
	adbExec(deviceID, "shell", "settings", "delete", "global", "http_proxy")
	adbExec(deviceID, "shell", "settings", "delete", "global", "global_http_proxy_host")
	adbExec(deviceID, "shell", "settings", "delete", "global", "global_http_proxy_port")
	if !checkProxyEnabled(deviceID) {
		return responseBody{Success: true, Message: "代理已清除"}
	}
	return responseBody{Success: false, Message: "清除可能未完全生效，建议重启设备"}
}

func installCert(deviceID string, certURL string, certHash string) responseBody {
	if strings.TrimSpace(certURL) == "" || strings.TrimSpace(certHash) == "" {
		return responseBody{Success: false, Message: "缺少 certUrl 或 certHash"}
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	resp, err := client.Get(certURL)
	if err != nil {
		return responseBody{Success: false, Message: "下载证书失败: " + err.Error()}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return responseBody{Success: false, Message: "下载证书失败: " + strconv.Itoa(resp.StatusCode)}
	}

	certPath := filepath.Join(os.TempDir(), fmt.Sprintf("mitm-ca-%d.crt", time.Now().UnixMilli()))
	file, err := os.Create(certPath)
	if err != nil {
		return responseBody{Success: false, Message: "创建临时证书失败: " + err.Error()}
	}
	if _, err := io.Copy(file, resp.Body); err != nil {
		file.Close()
		return responseBody{Success: false, Message: "写入临时证书失败: " + err.Error()}
	}
	file.Close()
	defer os.Remove(certPath)

	remotePath := "/system/etc/security/cacerts/" + certHash + ".0"
	adbExec(deviceID, "root")
	time.Sleep(2 * time.Second)
	adbExec(deviceID, "remount")
	time.Sleep(time.Second)
	adbExec(deviceID, "push", certPath, remotePath)
	adbExec(deviceID, "shell", "chmod", "644", remotePath)

	if checkCertInstalled(deviceID, certHash) {
		return responseBody{Success: true, Message: "证书已安装到 " + remotePath + "，建议重启设备生效"}
	}
	return responseBody{Success: false, Message: "证书推送后验证失败"}
}

func checkProxyEnabled(deviceID string) bool {
	proxy := adbExec(deviceID, "shell", "settings", "get", "global", "http_proxy")
	enabled := proxy != "" && proxy != ":0" && proxy != "null"
	if enabled && strings.HasPrefix(proxy, "127.0.0.1:") {
		port := strings.TrimPrefix(proxy, "127.0.0.1:")
		if strings.TrimSpace(port) == "" {
			port = "8888"
		}
		adbExec(deviceID, "reverse", "tcp:"+port, "tcp:"+port)
	}
	return enabled
}

func checkCertInstalled(deviceID string, certHash string) bool {
	paths := []string{
		"/system/etc/security/cacerts/" + certHash + ".0",
		"/data/misc/user/*/cacerts-added/" + certHash + ".0",
		"/data/misc/keychain/certs-added/" + certHash + ".0",
	}
	for _, certPath := range paths {
		output := adbExec(deviceID, "shell", "ls", certPath)
		lower := strings.ToLower(output)
		if strings.Contains(output, certHash) && !strings.Contains(lower, "no such file") {
			return true
		}
	}
	return false
}

func adbExec(deviceID string, args ...string) string {
	finalArgs := args
	if deviceID != "" {
		finalArgs = append([]string{"-s", deviceID}, args...)
	}
	cmd := exec.Command("adb", finalArgs...)
	hideCommandWindow(cmd)
	var out bytes.Buffer
	var errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut
	if err := cmd.Run(); err != nil && out.Len() == 0 {
		return strings.TrimSpace(errOut.String())
	}
	return strings.TrimSpace(out.String())
}

func hideCommandWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}
}

func decodeJSON(r *http.Request, target interface{}) error {
	if r.Body == nil {
		return nil
	}
	defer r.Body.Close()
	if r.ContentLength == 0 {
		return nil
	}
	return json.NewDecoder(r.Body).Decode(target)
}

func writeJSON(w http.ResponseWriter, status int, body responseBody) {
	setCORS(w)
	payload, _ := json.Marshal(body)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Length", strconv.Itoa(len(payload)))
	w.WriteHeader(status)
	_, _ = w.Write(payload)
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Private-Network", "true")
}

func envOrDefault(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

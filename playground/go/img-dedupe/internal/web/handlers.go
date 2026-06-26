package web

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/erancihan/img-dedupe/internal/service"
	"gorm.io/gorm"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func parseID(s string) (uint, error) {
	n, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(n), nil
}

// notFoundStatus maps record-not-found errors to 404, everything else to 500.
func notFoundStatus(err error) int {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return http.StatusNotFound
	}
	return http.StatusInternalServerError
}

func (s *Server) handleListFolders(w http.ResponseWriter, r *http.Request) {
	folders, err := s.svc.ListFolders()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, folders)
}

func (s *Server) handleRegisterFolder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if body.Path == "" {
		writeError(w, http.StatusBadRequest, errors.New("path is required"))
		return
	}
	folder, err := s.svc.RegisterFolder(body.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, folder)
}

func (s *Server) handleRemoveFolder(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.RemoveFolder(id, true); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleScan(w http.ResponseWriter, r *http.Request) {
	result, err := s.svc.ScanFolders(0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleDuplicates(w http.ResponseWriter, r *http.Request) {
	groups, err := s.svc.FindDuplicates()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if groups == nil {
		groups = []service.DuplicateGroup{}
	}
	writeJSON(w, http.StatusOK, groups)
}

func (s *Server) handleResolve(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Policy string `json:"policy"`
		DryRun bool   `json:"dry_run"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Policy == "" {
		body.Policy = string(service.KeepNewest)
	}
	result, err := s.svc.ResolveDuplicates(service.KeepPolicy(body.Policy), body.DryRun)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs    []uint `json:"ids"`
		DryRun bool   `json:"dry_run"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	result, err := s.svc.DeleteImages(body.IDs, body.DryRun)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleThumb(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	size := 256
	if q := r.URL.Query().Get("size"); q != "" {
		if n, convErr := strconv.Atoi(q); convErr == nil && n > 0 {
			size = n
		}
	}
	data, err := s.svc.Thumbnail(id, size)
	if err != nil {
		writeError(w, notFoundStatus(err), err)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(data)
}

func (s *Server) handleRaw(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	img, err := s.svc.ImageByID(id)
	if err != nil {
		writeError(w, notFoundStatus(err), err)
		return
	}
	http.ServeFile(w, r, img.Path)
}

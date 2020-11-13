package log

import (
	"fmt"
	"io"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	level = zap.NewAtomicLevel()

	defaultOutput = outputWrapper{os.Stderr}

	log = zap.New(zapcore.NewCore(
		NewEncoder(NewDefaultEncoderConfig()),
		zapcore.AddSync(&defaultOutput),
		level,
	), zap.AddCaller(), zap.AddCallerSkip(1))

	pkgloggers = []*zap.Logger{log}
)

type outputWrapper struct {
	io.Writer
}

func AddPkgLogger(logger *zap.Logger) *zap.Logger {
	if logger != nil {
		pkgloggers = append(pkgloggers, logger)
	}
	// We pass it back to allow callers to create&add in one statement.
	return logger
}

// SyncPkgLoggers can (and should) be used to flush the default pkg logger
// instances.  Zap encourages a sync on every logger since they can be
// interacted with in ways that cause buffering internally, and sync is the
// means to ensure the logger unbuffers fully before critical transitions (such
// as program termination).  Since the pkg loggers are not exported directly,
// this function exists to facilitate the sync action upon them.  Recipients of
// loggers instances returned through New*() functions are responsible for
// syncing them.
func SyncPkgLoggers() (result error) {
	// Need to sync multiple loggers, any of which could fail to sync.  So,
	// return the first failure, if any, but attempt to sync all of them.
	for _, l := range pkgloggers {
		if err := l.Sync(); err != nil {
			result = err
		}
	}
	return
}

// TODO(ktravis): not very important but maybe this should take a WriteSyncer instead
func RedirectStdLog(w io.Writer) (previous io.Writer) {
	fmt.Fprint(os.Stderr, "Redirecting program logger output\n")
	previous = defaultOutput.Writer
	defaultOutput.Writer = w
	return
}

func Output() io.Writer {
	return defaultOutput.Writer
}

func New() *zap.Logger {
	return log
}

// NewLogger creates a new child logger with the provided namespace.
func NewLogger(ns string) *zap.Logger {
	encoder := NewEncoder(NewDefaultEncoderConfig())
	encoder.OpenNamespace(ns)
	return log.WithOptions(zap.WrapCore(func(c zapcore.Core) zapcore.Core {
		return zapcore.NewCore(
			encoder,
			zapcore.AddSync(&defaultOutput),
			level,
		)
	}), zap.AddCaller())
}

// NewLogger creates a new child logger with the provided namespace and level.
// Since this specifies a level, it overrides the global package level for this
// child logger only.
func NewLoggerWithLevel(ns string, lvl zapcore.Level) *zap.Logger {
	encoder := NewEncoder(NewDefaultEncoderConfig())
	encoder.OpenNamespace(ns)
	return log.WithOptions(zap.WrapCore(func(c zapcore.Core) zapcore.Core {
		return zapcore.NewCore(
			encoder,
			zapcore.AddSync(&defaultOutput),
			lvl,
		)
	}), zap.AddCaller())
}

func SetLevel(lvl zapcore.Level) {
	level.SetLevel(lvl)
}

func Debug(msg string, fields ...zapcore.Field) {
	log.Debug(msg, fields...)
}

func Debugf(format string, args ...interface{}) {
	log.Debug(fmt.Sprintf(format, args...))
}

func Info(msg string, fields ...zapcore.Field) {
	log.Info(msg, fields...)
}

func Infof(format string, args ...interface{}) {
	log.Info(fmt.Sprintf(format, args...))
}

func Warn(msg string, fields ...zapcore.Field) {
	log.Warn(msg, fields...)
}

func Warnf(format string, args ...interface{}) {
	log.Warn(fmt.Sprintf(format, args...))
}

func Error(msg string, fields ...zapcore.Field) {
	log.Error(msg, fields...)
}

func Errorf(format string, args ...interface{}) {
	log.Error(fmt.Sprintf(format, args...))
}

func Fatal(msg interface{}, fields ...zapcore.Field) {
	switch t := msg.(type) {
	case string:
		log.Fatal(t, fields...)
	case error:
		log.Fatal(t.Error(), fields...)
	default:
		log.Fatal(fmt.Sprintf("%+v", msg), fields...)
	}
}

func Fatalf(format string, args ...interface{}) {
	log.Fatal(fmt.Sprintf(format, args...))
}

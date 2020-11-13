package log

import (
	"github.com/go-logr/logr"
	"go.uber.org/zap"
)

type zapLogr struct {
	*zap.SugaredLogger
}

func Logr(z *zap.SugaredLogger) logr.Logger {
	return zapLogr{z}
}

func (z zapLogr) Enabled() bool {
	return true
}

func (z zapLogr) Info(msg string, keysAndValues ...interface{}) {
	z.SugaredLogger.Infow(msg, keysAndValues...)
}

func (z zapLogr) Error(err error, msg string, keysAndValues ...interface{}) {
	keysAndValues = append([]interface{}{"error", err}, keysAndValues...)
	z.SugaredLogger.Errorw(msg, keysAndValues...)
}

func (z zapLogr) V(level int) logr.Logger {
	return z
}

func (z zapLogr) WithValues(keysAndValues ...interface{}) logr.Logger {
	return zapLogr{z.With(keysAndValues...)}
}

func (z zapLogr) WithName(name string) logr.Logger {
	return zapLogr{z.With("name", name)}
}

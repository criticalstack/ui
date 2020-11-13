package main

import (
	"context"
	"fmt"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"syscall"

	"github.com/criticalstack/ui/internal/app"
	"github.com/criticalstack/ui/internal/kube"
	"github.com/criticalstack/ui/internal/log"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"k8s.io/client-go/rest"
)

var (
	versionOnly    bool
	kubeConfigPath string

	config          app.Config
	configLoadError error
)

func init() {
	rootCmd.PersistentFlags().BoolVar(&versionOnly, "version", false, "Print version and exit")
	rootCmd.PersistentFlags().BoolVar(&config.InCluster, "incluster", false, "Run from container, and use the in-cluster configuration")
	rootCmd.PersistentFlags().BoolVar(&config.Debug, "debug", false, "Enable debug mode")
	rootCmd.PersistentFlags().StringVarP(&kubeConfigPath, "kubeconfig", "k", "", "Kubernetes configuration file. Defaults to checking $KUBECONFIG")
	rootCmd.PersistentFlags().StringVarP(&config.Address, "address", "a", app.DefaultServerAddress, "Address to serve app")
	rootCmd.PersistentFlags().StringVar(&config.CertFile, "cert-file", "", "SSL certificate for serving over HTTPS")
	rootCmd.PersistentFlags().StringVar(&config.KeyFile, "key-file", "", "SSL key file for serving over HTTPS")
	rootCmd.PersistentFlags().StringVar(&config.PrometheusEndpoint, "prometheus-endpoint", app.DefaultPrometheusEndpoint, "Endpoint used to retrieve prometheus metrics")
}

var rootCmd = &cobra.Command{
	Use:   "criticalstack ui",
	Short: "ui",
	Run: func(cmd *cobra.Command, args []string) {
		if versionOnly {
			fmt.Print(app.Version)
			return
		}
		if config.Debug {
			log.SetLevel(zap.DebugLevel)
			log.Debugf("debug logging is on: %+v", config)
		}
		if configLoadError != nil {
			log.Fatal(configLoadError)
		}

		kc, err := loadKubeConfig()
		if err != nil {
			log.Fatal(err)
		}
		config.KubeConfig = kc

		a, err := app.New(config)
		if err != nil {
			log.Fatal(err)
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// SIGTERM is caught because Docker/Kubernetes sends a SIGTERM on its first attempt to stop a container
		// SIGINT is caught because we often do ctrl-c to stop a process
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		go func() {
			sig := <-stop
			log.Infof("Received signal %v, stopping gracefully...", sig)
			cancel()
		}()

		if err := a.Run(ctx); err != nil {
			log.Fatal(err)
		}
	},
}

func loadKubeConfig() (*rest.Config, error) {
	if config.InCluster {
		return rest.InClusterConfig()
	}
	return kube.LoadConfig(kubeConfigPath)
}

func main() {
	// Ensure any buffered output emits upon termination.
	defer log.SyncPkgLoggers()

	// Load config values from environment after flags are declared, but before they are ultimately parsed. This allows
	// explicit flags to take priority over env vars.
	configLoadError = config.FromEnv()

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

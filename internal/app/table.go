package app

import (
	"context"

	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apiextensions-apiserver/pkg/registry/customresource/tableconvertor"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type tableConverter interface {
	ConvertToTable(context.Context, runtime.Object, runtime.Object) (*metav1.Table, error)
}

var swaggerMetadataDescriptions = metav1.ObjectMeta{}.SwaggerDoc()

func serveDefaultColumnsIfEmpty(columns []apiextensionsv1.CustomResourceColumnDefinition) []apiextensionsv1.CustomResourceColumnDefinition {
	if len(columns) > 0 {
		return columns
	}
	return []apiextensionsv1.CustomResourceColumnDefinition{
		{Name: "Age", Type: "date", Description: swaggerMetadataDescriptions["creationTimestamp"], JSONPath: ".metadata.creationTimestamp"},
	}
}

func (x *Controller) createTableConverter(ctx context.Context, cli client.Client, gvr schema.GroupVersionResource) (tableConverter, error) {
	var crd apiextensionsv1.CustomResourceDefinition
	if err := cli.Get(ctx, client.ObjectKey{Name: gvr.GroupResource().String()}, &crd); err != nil {
		return nil, newError(err)
	}
	var cols []apiextensionsv1.CustomResourceColumnDefinition
	for _, v := range crd.Spec.Versions {
		if v.Name == gvr.Version {
			cols = v.AdditionalPrinterColumns
			break
		}
	}
	return tableconvertor.New(serveDefaultColumnsIfEmpty(cols))
}

func (x *Controller) tableConverterFor(ctx context.Context, cli client.Client, gvr schema.GroupVersionResource) (tableConverter, error) {
	x.tcmu.RLock()
	tc, ok := x.tableConverters[gvr]
	x.tcmu.RUnlock()
	if ok {
		return tc, nil
	}
	x.tcmu.Lock()
	defer x.tcmu.Unlock()
	tc, err := x.createTableConverter(ctx, cli, gvr)
	if err != nil {
		return nil, err
	}
	x.tableConverters[gvr] = tc
	return tc, nil
}

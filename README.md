
### 问题汇总
- npm install --save-dev @types/node => 解决找不到"__dirname"名称问题

### 里程碑
- 2023年12月20日16:40:00
  - 1.处理文本节点更新逻辑
  - 2.梳理初始化渲染和更新逻辑
    - 2.1 初始化
      - 2.2.1 createRoot创建根容器
        - 1 babel编译jsx为render函数(jsxDEV),调用jsxDEV(ReactElement)生成虚拟DOM
        - 2 createRoot创建根fiberRoot => HostRootFiber
        - 3 初始化更新队列initializeUpdateQueue
        - 4 标记更容器markContainerAsRoot，缓存
        - 5 监听事件系统listenToAllSupportedEvents
      - 2.2.2 render阶段
        - 1 updateContainer更新容器
        - 2 createUpdate创建更新，enqueueUpdate更新入队
        - 3 scheduleUpdateOnFiber开始调度更新,ensureRootIsScheduled （最小堆、MessageChannel）
          - 3.1 performConcurrentWorkOnRoot从根节点开始准备并发工作
            - 3.1.1 renderRootSync同步渲染
              - prepareFreshStack准备更新队列，createWorkInProgress创建wip,finishQueueingConcurrentUpdates
              - workLoopSync进入工作循环
                - 1 performUnitOfWork开始执行工作单元
                  ```js
                  function workLoopSync() {
                    while (workInProgress !== null) {
                      performUnitOfWork(workInProgress);
                    }
                  }
                  ```
                  - beginWork
                  ```
                    1、递的阶段，虚拟DOM转fiber
                    2、处理函数组件时renderWithHooks，给hooks对象赋值，执行函数组件Component(props, secondArg);
                  ```
                  - completeUnitOfWork
                  ```
                    1、归的阶段，创建文本和元素节点的真实DOM元素，添加到父元素节点上，初始化属性
                    2、标记更新，冒泡副作用
                    3、创建
                  ```
            - 3.1.2 finishConcurrentRender结束并发渲染，进入commitRoot阶段
              - 1 commitBeforeMutationEffects
              - 2 commitMutationEffects
              ```
              根据副作用真正更新DOM内容
              1、recursivelyTraverseMutationEffects
              2、commitReconciliationEffects
              ```
              - 3 commitLayoutEffects
        
- 2023年12月21日11:45:38
  - 1. useReducer
  - 2. forwardRef/useRef

- 2023年12月22日16:28:59
  - 1. useImperativeHandle

- 2023年12月25日14:24:54
  - 1. useEffect
  ```
  useEffect的flag标记为PassiveEffect，会在下一个调度时执行useEffect的回调，ensureRootIsScheduled(root)
  ```
  - 2. useLayoutEffect
  ```
  给useLayoutEffect的flag标记为Update副作用，在commitLayoutEffects->commitHookLayoutEffects时会执行这个副作用
  if (flags & Update) {
    commitHookLayoutEffects(finishedWork, HookLayout | HookHasEffect);
  }

  两者的区别：useEffect在commit后会在下次调度时执行，而useLayoutEffect是渲染视图后同步执行
  ```
  - 3. useMemo/useCallback/memo

- 2023年12月28日15:50:34
  - 1. 处理useMemo/useCallback/memo更新问题
  ```
  浅比较更新前后属性，如果memo包裹的组件属性没有变化，则命中这里的优化策略
  - updateSimpleMemoComponent
  - shallowEqual(prevProps, nextProps)
  - bailoutOnAlreadyFinishedWork
  ```

- 2024年1月10日17:10:31
  - 1. 处理节点删除逻辑
  ```js
  // 收集需要删除的fiber
  // 在commit阶段的commitMutationEffectOnFiber的commitDeletionEffectsOnFiber中删除fiber.stateNode
  function createChildReconciler() {
    function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
      if (!shouldTrackSideEffects) {
        // Noop.
        return;
      }
      const deletions = returnFiber.deletions;
      if (deletions === null) {
        returnFiber.deletions = [childToDelete];
        returnFiber.flags |= ChildDeletion;
      } else {
        deletions.push(childToDelete);
      }
    }
  }

  removeChild(
    ((hostParent as any) as Instance),
    (deletedFiber.stateNode as Instance | TextInstance),
  );

  ```